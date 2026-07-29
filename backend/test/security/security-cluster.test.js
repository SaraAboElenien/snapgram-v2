import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';

vi.mock('../../helpers/sendEmail.js', () => ({
  sendEmail: vi.fn().mockResolvedValue(true),
}));

const { createTestApp } = await import('../helpers/createTestApp.js');
const { default: userModel } = await import('../../db/models/user.model.js');
const { default: postModel } = await import('../../db/models/post.model.js');
const { default: notificationModel } = await import('../../db/models/notification.model.js');

const app = createTestApp();

const signupConfirmSignin = async (email) => {
  const user = { firstName: 'Sec', lastName: 'Tester', email, password: 'Test@1234' };
  await request(app).post('/api/v1/auth/user/signup').send(user);
  await userModel.updateOne({ email }, { confirmed: true });
  const signinRes = await request(app)
    .post('/api/v1/auth/user/signin')
    .send({ email, password: user.password });
  return { token: signinRes.body.token, id: signinRes.body.user?.id };
};

describe('security cluster regressions (ADR-002 / ADR-003)', () => {
  it('sign-in JWT carries a real expiry, not an infinite session', async () => {
    const { token } = await signupConfirmSignin(`sec.jwt.${Date.now()}@example.com`);
    const decoded = jwt.decode(token);

    expect(decoded.exp).toBeTypeOf('number');
    expect(decoded.iat).toBeTypeOf('number');
    const lifetimeSeconds = decoded.exp - decoded.iat;
    // 7 days, per user.controller.js's signIn (expiresIn: '7d')
    expect(lifetimeSeconds).toBeGreaterThan(6 * 24 * 60 * 60);
    expect(lifetimeSeconds).toBeLessThan(8 * 24 * 60 * 60);
  });

  it('GET /user/list requires authentication', async () => {
    const noAuthRes = await request(app).get('/api/v1/auth/user/list');
    expect(noAuthRes.status).toBe(400);

    const { token } = await signupConfirmSignin(`sec.list.${Date.now()}@example.com`);
    const withAuthRes = await request(app)
      .get('/api/v1/auth/user/list')
      .set('Authorization', `Bearer ${token}`);
    expect(withAuthRes.status).toBe(200);
  });

  it("a user cannot see or mark-read another user's notifications (IDOR)", async () => {
    const a = await signupConfirmSignin(`sec.idor.a.${Date.now()}@example.com`);
    const b = await signupConfirmSignin(`sec.idor.b.${Date.now()}@example.com`);

    // B follows A -> creates a real "follow" notification for A
    await request(app)
      .put(`/api/v1/auth/user/${a.id}/follow`)
      .set('Authorization', `Bearer ${b.token}`)
      .send({ action: 'follow' });

    const notifForA = await notificationModel.findOne({ receiver: a.id, sender: b.id, type: 'follow' });
    expect(notifForA).not.toBeNull();

    // B should not see A's notification in their own list
    const bListRes = await request(app)
      .get('/api/v1/auth/notification')
      .set('Authorization', `Bearer ${b.token}`);
    expect(bListRes.status).toBe(200);
    expect(bListRes.body.notifications.some((n) => String(n._id) === String(notifForA._id))).toBe(false);

    // B cannot mark A's notification as read
    const bMarkReadRes = await request(app)
      .patch(`/api/v1/auth/notification/${notifForA._id}/read`)
      .set('Authorization', `Bearer ${b.token}`);
    expect(bMarkReadRes.status).toBe(404);

    const stillUnread = await notificationModel.findById(notifForA._id);
    expect(stillUnread.isRead).toBe(false);

    // A can mark their own notification as read
    const aMarkReadRes = await request(app)
      .patch(`/api/v1/auth/notification/${notifForA._id}/read`)
      .set('Authorization', `Bearer ${a.token}`);
    expect(aMarkReadRes.status).toBe(200);
  });

  it('ApiFeatures.filter() ignores query keys outside the allow-list (no injection)', async () => {
    const { token, id: userId } = await signupConfirmSignin(`sec.filter.${Date.now()}@example.com`);
    await postModel.create([
      { userId, description: 'post one', image: { secure_url: 'https://example.com/1.png', public_id: 'p1' } },
      { userId, description: 'post two', image: { secure_url: 'https://example.com/2.png', public_id: 'p2' } },
    ]);

    const baselineRes = await request(app)
      .get('/api/v1/auth/post/recent-post')
      .set('Authorization', `Bearer ${token}`);
    expect(baselineRes.status).toBe(200);
    const baselineCount = baselineRes.body.documents.length;

    // $where is not in getRecentPosts' allow-list (["userId","tags","location","likes","createdAt"]),
    // so it must never reach the Mongo query at all, regardless of what it contains.
    const injectionRes = await request(app)
      .get('/api/v1/auth/post/recent-post')
      .query({ $where: "this.constructor.constructor('return process')().exit()" })
      .set('Authorization', `Bearer ${token}`);

    expect(injectionRes.status).toBe(200);
    expect(injectionRes.body.documents.length).toBe(baselineCount);
  });
});
