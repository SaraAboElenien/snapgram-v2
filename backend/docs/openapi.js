// OpenAPI 3.0 spec for every real endpoint in this API, hand-written directly
// against the actual route/validation/controller files (not generated from
// JSDoc annotations scattered through the codebase) — see ENGINEERING_PRINCIPLES.md
// ("every API endpoint must be documented") and REFACTOR_PLAN.md's API Design
// section. Served at /api-docs via swagger-ui-express; see initApp.js.
//
// Kept as one plain JS object (not YAML) so no new parser dependency is
// needed beyond swagger-ui-express itself.

const bearerAuth = { bearerAuth: [] };

const errorResponse = (description) => ({
  description,
  content: {
    'application/json': {
      schema: { $ref: '#/components/schemas/Error' },
    },
  },
});

export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Snapgram API',
    version: '1.0.0',
    description:
      'REST API for Snapgram — a social media app (posts, comments, likes, follows, notifications, stories, real-time 1:1 chat). ' +
      'All endpoints except signup/signin/email-confirmation/password-reset require a `Bearer` JWT issued by `/user/signin`. ' +
      'Auth endpoints (signup/signin/forgetPassword/resetPassword) are rate-limited to 10 requests per 15 minutes per IP, shared across all four.',
  },
  servers: [{ url: '/api/v1/auth', description: 'All routes are mounted under this prefix' }],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Obtained from POST /user/signin. Send as `Authorization: Bearer <token>`.',
      },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          message: { type: 'string', example: 'error' },
          err: { type: 'string', example: 'Human-readable error detail' },
        },
      },
      ImageAsset: {
        type: 'object',
        properties: {
          secure_url: { type: 'string', format: 'uri' },
          public_id: { type: 'string' },
        },
      },
      User: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          firstName: { type: 'string' },
          lastName: { type: 'string' },
          email: { type: 'string', format: 'email' },
          profileImage: { $ref: '#/components/schemas/ImageAsset' },
          bio: { type: 'string' },
          followers: { type: 'array', items: { type: 'string' } },
          following: { type: 'array', items: { type: 'string' } },
          isFollowing: { type: 'boolean', description: 'Only present on /user/list — whether the requesting user follows this one' },
        },
      },
      Post: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          userId: { oneOf: [{ type: 'string' }, { $ref: '#/components/schemas/User' }] },
          description: { type: 'string' },
          tags: { type: 'array', items: { type: 'string' } },
          location: { type: 'string' },
          image: { $ref: '#/components/schemas/ImageAsset' },
          likes: { type: 'array', items: { type: 'string' } },
          comments: { type: 'array', items: { type: 'string' } },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      Comment: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          userId: { oneOf: [{ type: 'string' }, { $ref: '#/components/schemas/User' }] },
          postId: { type: 'string' },
          comment: { type: 'string' },
          likes: { type: 'array', items: { type: 'string' } },
          replies: { type: 'array', items: { type: 'object' } },
        },
      },
      Notification: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          receiver: { type: 'string' },
          sender: { oneOf: [{ type: 'string' }, { $ref: '#/components/schemas/User' }] },
          type: { type: 'string', enum: ['like', 'comment', 'follow', 'newPost', 'save'] },
          post: { type: 'string' },
          content: { type: 'string' },
          isRead: { type: 'boolean' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      Story: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          userId: { type: 'string' },
          image: { $ref: '#/components/schemas/ImageAsset' },
          expiresAt: { type: 'string', format: 'date-time', description: '24h after creation; TTL-indexed, auto-deleted by MongoDB' },
          viewers: {
            type: 'array',
            items: {
              type: 'object',
              properties: { userId: { type: 'string' }, viewedAt: { type: 'string', format: 'date-time' } },
            },
          },
        },
      },
      Conversation: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          participants: { type: 'array', items: { type: 'string' } },
          otherParticipant: { $ref: '#/components/schemas/User' },
          unreadCount: { type: 'integer' },
          lastMessage: {
            type: 'object',
            properties: {
              text: { type: 'string' },
              senderId: { type: 'string' },
              createdAt: { type: 'string', format: 'date-time' },
            },
          },
        },
      },
      Message: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          conversationId: { type: 'string' },
          senderId: { type: 'string' },
          text: { type: 'string' },
          readBy: { type: 'array', items: { type: 'string' } },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
    },
  },
  tags: [
    { name: 'User', description: 'Auth, profile, follow graph' },
    { name: 'Post', description: 'Posts, likes, saves, feed' },
    { name: 'Comment', description: 'Comments and replies on a post' },
    { name: 'Notification', description: 'In-app notifications' },
    { name: 'Story', description: '24h-expiring image stories' },
    { name: 'Chat', description: 'Real-time 1:1 messaging between mutual follows' },
  ],
  paths: {
    // ---------------- User ----------------
    '/user/signup': {
      post: {
        tags: ['User'],
        summary: 'Create an account',
        description: 'Sends a confirmation email; the account cannot sign in until confirmed. Rate-limited (10/15min, shared with signin/forgetPassword/resetPassword).',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['firstName', 'lastName', 'email', 'password'],
                properties: {
                  firstName: { type: 'string', minLength: 3, maxLength: 30 },
                  lastName: { type: 'string', minLength: 3, maxLength: 30 },
                  email: { type: 'string', format: 'email' },
                  password: {
                    type: 'string',
                    minLength: 8,
                    description: 'Must contain lowercase, uppercase, a digit, and one of @$!%*?&',
                  },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Registered — confirmation email sent' },
          400: errorResponse('Validation error'),
          429: errorResponse('Rate limit exceeded'),
        },
      },
    },
    '/user/confirmEmail/{token}': {
      get: {
        tags: ['User'],
        summary: 'Confirm an account via the emailed link',
        parameters: [{ name: 'token', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Account confirmed' }, 400: errorResponse('Invalid or expired token') },
      },
    },
    '/user/confirmEmailRefresher/{refreshToken}': {
      get: {
        tags: ['User'],
        summary: 'Request a fresh confirmation email if the original link expired',
        parameters: [{ name: 'refreshToken', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'New confirmation email sent' }, 400: errorResponse('Invalid or expired refresh token') },
      },
    },
    '/user/signin': {
      post: {
        tags: ['User'],
        summary: 'Sign in',
        description: 'Rate-limited (10/15min, shared with signup/forgetPassword/resetPassword). Requires `confirmed: true` on the account.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: { email: { type: 'string', format: 'email' }, password: { type: 'string' } },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Signed in',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string' },
                    token: { type: 'string' },
                    user: { type: 'object', properties: { id: { type: 'string' }, email: { type: 'string' } } },
                  },
                },
              },
            },
          },
          401: errorResponse('Invalid email or password'),
          429: errorResponse('Rate limit exceeded'),
        },
      },
    },
    '/user/logout': {
      post: {
        tags: ['User'],
        summary: 'Log out (revokes this and every other currently-issued token)',
        description:
          'Bumps the account\'s sessionVersion, checked in auth.js on every request — this is an all-or-nothing revocation (every session for this user stops working, not just the one that called logout), not a per-device "log out this session only" action.',
        security: [bearerAuth],
        responses: { 200: { description: 'Logged out' }, 401: errorResponse('Missing/invalid token') },
      },
    },
    '/user/forgetPassword': {
      patch: {
        tags: ['User'],
        summary: 'Request a password-reset code by email',
        description: 'Rate-limited (10/15min, shared). Code expires 15 minutes after being sent.',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', required: ['email'], properties: { email: { type: 'string', format: 'email' } } } } },
        },
        responses: { 200: { description: 'Reset code emailed' }, 429: errorResponse('Rate limit exceeded') },
      },
    },
    '/user/resetPassword': {
      patch: {
        tags: ['User'],
        summary: 'Reset password using the emailed code',
        description: 'Rate-limited (10/15min, shared). Rejects an expired or incorrect code.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'code', 'password'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  code: { type: 'string' },
                  password: { type: 'string' },
                },
              },
            },
          },
        },
        responses: { 200: { description: 'Password updated' }, 400: errorResponse('Invalid or expired code'), 429: errorResponse('Rate limit exceeded') },
      },
    },
    '/user/list': {
      get: {
        tags: ['User'],
        summary: "List users (excludes yourself, includes isFollowing per user)",
        security: [bearerAuth],
        responses: {
          200: { description: 'OK', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/User' } } } } },
          401: errorResponse('Missing/invalid token'),
        },
      },
    },
    '/user/userByID/{id}': {
      get: {
        tags: ['User'],
        summary: 'Get a user by id',
        security: [bearerAuth],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'OK' }, 401: errorResponse('Missing/invalid token'), 404: errorResponse('User not found') },
      },
    },
    '/user/profile': {
      get: {
        tags: ['User'],
        summary: "Get the signed-in user's own profile",
        security: [bearerAuth],
        responses: { 200: { description: 'OK' }, 401: errorResponse('Missing/invalid token') },
      },
    },
    '/user/{id}/follow': {
      put: {
        tags: ['User'],
        summary: 'Follow or unfollow a user',
        description: 'Not a REST-y toggle — the action is explicit in the body. Rejects following yourself.',
        security: [bearerAuth],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' }, description: 'User to follow/unfollow' }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', required: ['action'], properties: { action: { type: 'string', enum: ['follow', 'unfollow'] } } } } },
        },
        responses: { 200: { description: 'Follow state updated' }, 400: errorResponse('Cannot follow yourself / invalid action'), 401: errorResponse('Missing/invalid token') },
      },
    },
    '/user/updateProfile': {
      patch: {
        tags: ['User'],
        summary: 'Update first/last name, bio, and/or profile photo',
        description: 'Email is intentionally not editable here. Multipart — image field is optional; omitting it keeps the existing photo.',
        security: [bearerAuth],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: {
                  firstName: { type: 'string' },
                  lastName: { type: 'string' },
                  bio: { type: 'string' },
                  profileImage: { type: 'string', format: 'binary' },
                },
              },
            },
          },
        },
        responses: { 200: { description: 'Profile updated' }, 400: errorResponse('Validation error'), 401: errorResponse('Missing/invalid token') },
      },
    },
    '/user/deleteProfile': {
      delete: {
        tags: ['User'],
        summary: 'Delete your own account',
        description: 'Cascades: own posts + their Cloudinary images, comments (own and left on others), notifications, stories, conversations/messages, profile image, and removes you from every other user\'s followers/following/savedPosts arrays.',
        security: [bearerAuth],
        responses: { 200: { description: 'Account deleted' }, 401: errorResponse('Missing/invalid token') },
      },
    },

    // ---------------- Post ----------------
    '/post/create-post': {
      post: {
        tags: ['Post'],
        summary: 'Create a post',
        description: 'Notifies every follower of the author (`newPost`).',
        security: [bearerAuth],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['description', 'postImage'],
                properties: {
                  description: { type: 'string', minLength: 1, maxLength: 500 },
                  location: { type: 'string', maxLength: 100 },
                  tags: { type: 'string', description: 'Comma-separated' },
                  postImage: { type: 'string', format: 'binary' },
                },
              },
            },
          },
        },
        responses: { 201: { description: 'Post created', content: { 'application/json': { schema: { $ref: '#/components/schemas/Post' } } } }, 400: errorResponse('Missing image or validation error'), 401: errorResponse('Missing/invalid token') },
      },
    },
    '/post/{id}': {
      put: {
        tags: ['Post'],
        summary: 'Update a post (text-only or with a new image)',
        description: 'Omitting the image keeps the existing one. Owner-only.',
        security: [bearerAuth],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: {
                  description: { type: 'string', maxLength: 500 },
                  location: { type: 'string', maxLength: 100 },
                  tags: { type: 'string' },
                  postImage: { type: 'string', format: 'binary' },
                },
              },
            },
          },
        },
        responses: { 200: { description: 'Post updated' }, 401: errorResponse('Missing/invalid token'), 403: errorResponse('Not the post owner') },
      },
      get: {
        tags: ['Post'],
        summary: 'Get a single post',
        security: [bearerAuth],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/Post' } } } }, 404: errorResponse('Post not found') },
      },
      delete: {
        tags: ['Post'],
        summary: 'Delete a post',
        description: 'Owner-only. Cascades: comments, notifications referencing it, removal from every savedPosts array, and its Cloudinary image.',
        security: [bearerAuth],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Post deleted' }, 401: errorResponse('Missing/invalid token'), 403: errorResponse('Not the post owner') },
      },
    },
    '/post/user-post/{userId}': {
      get: {
        tags: ['Post'],
        summary: "Get a user's posts (paginated)",
        security: [bearerAuth],
        parameters: [
          { name: 'userId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
        ],
        responses: { 200: { description: 'OK (always 200, even with zero posts)' } },
      },
    },
    '/post/recent-post': {
      get: {
        tags: ['Post'],
        summary: 'Home/Explore feed — recent posts, optionally searched',
        security: [bearerAuth],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
          { name: 'search', in: 'query', schema: { type: 'string' }, description: 'Regex-matches description and tags' },
        ],
        responses: {
          200: {
            description: 'OK',
            content: { 'application/json': { schema: { type: 'object', properties: { documents: { type: 'array', items: { $ref: '#/components/schemas/Post' } }, hasNextPage: { type: 'boolean' } } } } },
          },
        },
      },
    },
    '/post/saved-posts': {
      get: {
        tags: ['Post'],
        summary: 'Your saved posts (paginated, newest-saved-post-creation-date first)',
        security: [bearerAuth],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
        ],
        responses: { 200: { description: 'OK' } },
      },
    },
    '/post/popular-tags': {
      get: {
        tags: ['Post'],
        summary: 'Top 8 tags by usage count, for Explore\'s tag chips',
        security: [bearerAuth],
        responses: { 200: { description: 'OK', content: { 'application/json': { schema: { type: 'array', items: { type: 'object', properties: { tag: { type: 'string' }, count: { type: 'integer' } } } } } } } },
      },
    },
    '/post/{id}/is-saved': {
      get: {
        tags: ['Post'],
        summary: 'Whether the signed-in user has saved this post (decoupled from the full saved-list fetch)',
        security: [bearerAuth],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'OK', content: { 'application/json': { schema: { type: 'object', properties: { isSaved: { type: 'boolean' } } } } } } },
      },
    },
    '/post/{id}/like': {
      put: {
        tags: ['Post'],
        summary: 'Like or unlike a post (toggle)',
        description: 'Notifies the post owner on like (not unlike, not on self-like).',
        security: [bearerAuth],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Like toggled' }, 401: errorResponse('Missing/invalid token'), 404: errorResponse('Post not found') },
      },
    },
    '/post/{postId}/save': {
      put: {
        tags: ['Post'],
        summary: 'Save a post',
        description: 'Notifies the post owner (not on self-save). 400s on an already-saved post rather than duplicating.',
        security: [bearerAuth],
        parameters: [{ name: 'postId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Saved' }, 400: errorResponse('Already saved'), 401: errorResponse('Missing/invalid token') },
      },
      delete: {
        tags: ['Post'],
        summary: 'Unsave a post',
        security: [bearerAuth],
        parameters: [{ name: 'postId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Unsaved' }, 401: errorResponse('Missing/invalid token') },
      },
    },
    '/post/user/{id}/liked': {
      get: {
        tags: ['Post'],
        summary: 'Posts a given user has liked (paginated, newest-first)',
        security: [bearerAuth],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
        ],
        responses: { 200: { description: 'OK' } },
      },
    },

    // ---------------- Comment (mounted under /post/{postId}/comment) ----------------
    '/post/{postId}/comment/add': {
      post: {
        tags: ['Comment'],
        summary: 'Add a comment to a post',
        description: 'Notifies the post owner (not on self-comment).',
        security: [bearerAuth],
        parameters: [{ name: 'postId', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['comment'], properties: { comment: { type: 'string', minLength: 1, maxLength: 500 } } } } } },
        responses: { 201: { description: 'Comment created', content: { 'application/json': { schema: { $ref: '#/components/schemas/Comment' } } } }, 400: errorResponse('Validation error') },
      },
    },
    '/post/{postId}/comment/edit/{commentId}': {
      put: {
        tags: ['Comment'],
        summary: 'Edit a comment (owner-only)',
        description: 'Note: this endpoint\'s body field is `content`, unlike creation\'s `comment` — a known, pre-existing naming inconsistency, not a doc error.',
        security: [bearerAuth],
        parameters: [
          { name: 'postId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'commentId', in: 'path', required: true, schema: { type: 'string' } },
        ],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['content'], properties: { content: { type: 'string', minLength: 1, maxLength: 500 } } } } } },
        responses: { 200: { description: 'Comment updated' }, 403: errorResponse('Not the comment owner') },
      },
    },
    '/post/{postId}/comment/{commentId}': {
      delete: {
        tags: ['Comment'],
        summary: 'Delete a comment (owner-only)',
        security: [bearerAuth],
        parameters: [
          { name: 'postId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'commentId', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: { 200: { description: 'Comment deleted' }, 403: errorResponse('Not the comment owner') },
      },
    },
    '/post/{postId}/comment': {
      get: {
        tags: ['Comment'],
        summary: 'Get all comments for a post',
        security: [bearerAuth],
        parameters: [{ name: 'postId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'OK', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Comment' } } } } } },
      },
    },
    '/post/{postId}/comment/{commentId}/reply': {
      post: {
        tags: ['Comment'],
        summary: 'Reply to a comment',
        security: [bearerAuth],
        parameters: [
          { name: 'postId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'commentId', in: 'path', required: true, schema: { type: 'string' } },
        ],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['comment'], properties: { comment: { type: 'string', minLength: 1, maxLength: 500 } } } } } },
        responses: { 201: { description: 'Reply added' } },
      },
    },
    '/post/{postId}/comment/{commentId}/like': {
      patch: {
        tags: ['Comment'],
        summary: 'Like or unlike a comment (toggle)',
        security: [bearerAuth],
        parameters: [
          { name: 'postId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'commentId', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: { 200: { description: 'Like toggled' } },
      },
    },

    // ---------------- Notification ----------------
    '/notification': {
      get: {
        tags: ['Notification'],
        summary: 'Get your notifications (newest-first)',
        security: [bearerAuth],
        responses: { 200: { description: 'OK', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Notification' } } } } } },
      },
    },
    '/notification/{id}/read': {
      patch: {
        tags: ['Notification'],
        summary: 'Mark a notification as read',
        description: 'IDOR-checked — only the receiver can mark it read.',
        security: [bearerAuth],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Marked read' }, 403: errorResponse('Not the notification\'s receiver'), 404: errorResponse('Notification not found') },
      },
    },

    // ---------------- Story ----------------
    '/story/create': {
      post: {
        tags: ['Story'],
        summary: 'Post a new 24-hour story',
        security: [bearerAuth],
        requestBody: { required: true, content: { 'multipart/form-data': { schema: { type: 'object', required: ['storyImage'], properties: { storyImage: { type: 'string', format: 'binary' } } } } } },
        responses: { 201: { description: 'Story created', content: { 'application/json': { schema: { $ref: '#/components/schemas/Story' } } } }, 400: errorResponse('Missing image') },
      },
    },
    '/story/feed': {
      get: {
        tags: ['Story'],
        summary: "Own + followed users' active stories, grouped by author",
        description: 'Own group first, then unseen-before-seen ordering. Each group has a `hasUnseen` flag (always false for your own group — you can\'t "unsee" your own content).',
        security: [bearerAuth],
        responses: { 200: { description: 'OK' } },
      },
    },
    '/story/{id}/view': {
      put: {
        tags: ['Story'],
        summary: 'Mark a story as viewed',
        description: 'Idempotent; skips recording the owner viewing their own story.',
        security: [bearerAuth],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'View recorded' } },
      },
    },
    '/story/{id}/viewers': {
      get: {
        tags: ['Story'],
        summary: '"Seen by" list — owner-only',
        security: [bearerAuth],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'OK' }, 403: errorResponse('Not the story owner') },
      },
    },
    '/story/{id}': {
      delete: {
        tags: ['Story'],
        summary: 'Delete a story early (owner-only)',
        description: 'Destroys the Cloudinary asset directly, since this bypasses the TTL sweep.',
        security: [bearerAuth],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Story deleted' }, 403: errorResponse('Not the story owner') },
      },
    },

    // ---------------- Chat ----------------
    '/chat/contacts': {
      get: {
        tags: ['Chat'],
        summary: 'Mutual-follow contacts, for the "new chat" picker',
        security: [bearerAuth],
        responses: { 200: { description: 'OK', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/User' } } } } } },
      },
    },
    '/chat/conversations': {
      post: {
        tags: ['Chat'],
        summary: 'Start (or get the existing) conversation with another user',
        description: '403s unless the two users mutually follow each other. Idempotent — starting the same pair twice returns the same conversation.',
        security: [bearerAuth],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['userId'], properties: { userId: { type: 'string' } } } } } },
        responses: { 200: { description: 'Conversation (created or existing)', content: { 'application/json': { schema: { $ref: '#/components/schemas/Conversation' } } } }, 400: errorResponse('Cannot message yourself'), 403: errorResponse('Not mutually followed') },
      },
      get: {
        tags: ['Chat'],
        summary: 'List your conversations, with per-conversation unread counts',
        security: [bearerAuth],
        responses: { 200: { description: 'OK', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Conversation' } } } } } },
      },
    },
    '/chat/conversations/{id}/messages': {
      get: {
        tags: ['Chat'],
        summary: 'Message history for a conversation',
        description: '403s for a non-participant.',
        security: [bearerAuth],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'OK', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Message' } } } } }, 403: errorResponse('Not a participant') },
      },
      post: {
        tags: ['Chat'],
        summary: 'Send a message',
        description: 'Real (testable) REST write; also pushes a `message:new` Socket.io event to the recipient in real time.',
        security: [bearerAuth],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['text'], properties: { text: { type: 'string', minLength: 1, maxLength: 2000 } } } } } },
        responses: { 201: { description: 'Message sent', content: { 'application/json': { schema: { $ref: '#/components/schemas/Message' } } } }, 403: errorResponse('Not a participant') },
      },
    },
    '/chat/conversations/{id}/read': {
      put: {
        tags: ['Chat'],
        summary: "Mark a conversation's messages as read",
        security: [bearerAuth],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Marked read' }, 403: errorResponse('Not a participant') },
      },
    },
  },
};
