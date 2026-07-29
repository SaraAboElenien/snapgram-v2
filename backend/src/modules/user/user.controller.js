import bcryptjs from 'bcrypt'
import jsonwebtoken from 'jsonwebtoken';
import userModel from '../../../db/models/user.model.js';
import { sendEmail } from '../../../helpers/sendEmail.js';
import jwt from 'jsonwebtoken';
import { nanoid } from 'nanoid';
import { asyncHandler } from '../../../helpers/globleErrorHandling.js';
import { AppError } from '../../../helpers/classError.js';
import path from 'path'
import fs from 'fs';
import cloudinary from '../../../helpers/cloudinary.js';
import { deleteUserAccount, followOrUnfollowUser } from './user.service.js';
const { compare, hash } = bcryptjs;
const { sign } = jsonwebtoken;


//========== Sign up ===========//
export const signUp = asyncHandler(async (req, res, next) => {

    const { firstName, lastName, email, password } = req.body;
    const userExist = await userModel.findOne({ email: email.toLowerCase() });
    if (userExist) {
        return res.status(409).json({ message: "This email is already registered!, please use another email!" });
    } else {

        const token = jwt.sign({ email }, process.env.confirmationKey, { expiresIn: 60 * 2 })
        const confirmationLink = `${req.protocol}://${req.headers.host}/api/v1/auth/user/confirmEmail/${token}`

        const refreshToken = jwt.sign({ email }, process.env.confirmationKeyRefresher)
        const confirmationLinkRefresher = `${req.protocol}://${req.headers.host}/api/v1/auth/user/confirmEmailRefresher/${refreshToken}`



        const checkEmail = await sendEmail(email, "Confirm email address", `<a href='${confirmationLink}'> Confirm your email</a> <br>
          <a href='${confirmationLinkRefresher}'> Click to resend the link</a>  `)
        if (!checkEmail) {
            return next(new AppError("Failed to send email", 409))
        }
        const hashedPassword = await hash(password, parseInt(process.env.saltRounds));
        const newUser = {
            firstName,
            lastName,
            email,
            password: hashedPassword,
        };

        await userModel.create(newUser);
        newUser ? res.status(201).json({ message: "Congrats! You're registered", newUser }) : next(new AppError("Failed to register!", 500));
    }
})

//======== Email confirmation ==========//
export const confirmEmail = async (req, res, next) => {
    const { token } = req.params;
    const decoded = jwt.verify(token, process.env.confirmationKey);
    if (!decoded?.email) {
        return next(new AppError("Invalid payload", 400))
    }
    const user = await userModel.findOneAndUpdate({ email: decoded.email, confirmed: false }, { confirmed: true }, { new: true });
    if (!user) {
        return next(new AppError("Your email is already confirmed", 400))
    }
    res.status(200).json({ message: "Your Email got confirmed <3"});
};


//======== Email confirmation refresher==========//
export const refreshConfirmation = async (req, res, next) => {
    const { refreshToken } = req.params;
    const decoded = jwt.verify(refreshToken, process.env.confirmationKeyRefresher);
    if (!decoded?.email) {
        return next(new AppError("Invalid payload", 400))
    }
    const user = await userModel.findOne({ email: decoded.email, confirmed: true });
    if (user) {
        return next(new AppError("Your email is already confirmed", 400))
    }

    const token = jwt.sign({ email: decoded.email }, process.env.confirmationKey)
    const confirmationLink = `${req.protocol}://${req.headers.host}/api/v1/auth/user/confirmEmail/${token}`

    await sendEmail(decoded.email, "Confirm email address", `<a href='${confirmationLink}'> Confirm your email</a>`)
    res.status(200).json({ message: "Your Email got confirmed <3", user });
};


//======== forget password =========//
export const forgetPassword = asyncHandler(async (req, res, next) => {
    const { email } = req.body;
    const user = await userModel.findOne({ email });
    if (!user) {
        return next(new AppError("User not valid!", 400))
    }
    const code = nanoid(5);
    // 15-minute window — combined with the rate limit on this route and on
    // resetPassword itself, closes the previously-unbounded guessing window
    // (see PHASE3_SECURITY_SCOPE.md Finding 2).
    const codeExpiresAt = new Date(Date.now() + 15 * 60 * 1000);
    await sendEmail(email, "Job search app ", `<h1>Here is your code:${code}</h1>`);
    await userModel.updateOne({ email }, { code, codeExpiresAt });
    res.status(200).json({ message: 'Please check your email for the link..' });
})

//=========== Reset password =========//
export const resetPassword = asyncHandler(async (req, res, next) => {
    const { email, code, password } = req.body;
    const user = await userModel.findOne({ email });
    if (!user) {
        return next(new AppError("User not valid!", 400))
    }
    if (!user.code || user.code !== code) {
        return next(new AppError("Invalid code!", 400))
    }
    if (!user.codeExpiresAt || user.codeExpiresAt.getTime() < Date.now()) {
        return next(new AppError("This code has expired, please request a new one.", 400))
    }
    const hashedPassword = await hash(password, parseInt(process.env.saltRounds));
    await userModel.updateOne({ email }, { password: hashedPassword, code: "", codeExpiresAt: null, passwordChangedAt: Date.now() })
    res.status(200).json({ message: 'Your password successfully updated.' });
})




//============ sign in =============//
export const signIn = asyncHandler(async (req, res, next) => {
    const { email, password } = req.body;
    const user = await userModel.findOne({ email: email.toLowerCase(), confirmed: true });

    if (!user) {
        return next(new AppError("Invalid email or password", 401));
    }

    // Compare password
    if (!await compare(password, user.password)) {
        return next(new AppError("Invalid email or password", 401));
    }

    const token = sign(
        { id: user._id, email, role: user.role, sessionVersion: user.sessionVersion },
        process.env.sessionKey,
        { expiresIn: '7d' }
    );
    user.loggedIn = 'true';
    await user.save();

    res.json({
        message: "Signin successful",
        token,
        // This is for the frontend response..
        user: {
            id: user._id,
            email: user.email,
            name: user.name,
            // Add other necessary fields
        },
    });
});


//=========== List all users with count ============//
export const listUsers = asyncHandler(async (req, res, next) => {
    const followingSet = new Set((req.user.following || []).map(String));

    const users = await userModel.find(
        { _id: { $ne: req.user._id } },
        'firstName lastName profileImage createdAt updatedAt'
    );

    const usersWithFollowStatus = users.map((user) => ({
        ...user.toObject(),
        isFollowing: followingSet.has(String(user._id)),
    }));

    res.status(200).json({
        message: 'User list retrieved successfully',
        userCount: usersWithFollowStatus.length,
        users: usersWithFollowStatus
    });
});





//=========== Get User By ID ============//
// This is the user Profile //
export const userByID = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    console.log('Received ID:', id); 
    const user = await userModel.findById(id).select('-password');
    if (!user) {
        return next(new AppError("Could not retrieve user!", 400)); 
    }
    res.status(200).json(user); 
    console.log('User found:', user);
});


   


//=========== Read User Details ============//
export const read = (req, res) => {
    const { user } = req; 
    const { password,confirmed,loggedIn,role, ...userDetails } = user.toObject(); 
    res.status(200).json({ message: 'User details retrieved successfully', user: userDetails });
};



//=========== Update User Profile ============//
export const updateAccount = asyncHandler(async (req, res, next) => {
  const user = req.user;
  const { firstName, lastName, email, bio } = req.body;

  const updatedData = {};

  if (firstName) updatedData.firstName = firstName;
  if (lastName) updatedData.lastName = lastName;
  if (bio) updatedData.bio = bio;

  if (req.uploadedImage) {
    try {
      if (user.profileImage?.public_id && user.profileImage.public_id !== process.env.defaultpuplicPic) {
        await cloudinary.uploader.destroy(user.profileImage.public_id);
      }

      const { secure_url, public_id } = req.uploadedImage;
      updatedData.profileImage = { secure_url, public_id };
    } catch (error) {
      return next(new AppError(`Error updating profile image: ${error.message}`, 500));
    }
  }

  try {
    // Single write for both the profile-image change and the text-field
    // changes — previously this was two separate saves (a .save() for the
    // image, then a findByIdAndUpdate for the text fields), which could
    // leave a partial update if the process died between them.
    const updatedUser = await userModel.findByIdAndUpdate(user._id, updatedData, {
      new: true,
      runValidators: true,
    });

    if (!updatedUser) {
      return next(new AppError('User not found!', 404));
    }

    const { password, confirmed, loggedIn, role, ...userDetails } = updatedUser.toObject();

    res.status(200).json({
      message: 'Your account updated successfully <3',
      user: userDetails,
    });
  } catch (error) {
    return next(new AppError('Failed to update user profile. Please try again.', 500));
  }
});


//=========== Delete User Account ============//
export const deleteAccount = asyncHandler(async (req, res, next) => {
    await deleteUserAccount(req.user);
    res.status(200).json({ message: "Your account has been deleted successfully." });
});



//=========== Follow/Unfollow a User ============//
export const followUser = asyncHandler(async (req, res, next) => {
    const { id: targetId } = req.params;
    const userId = req.user.id;
    const { action } = req.body;

    const result = await followOrUnfollowUser({ userId, targetId, action });
    res.status(200).json(result);
});


// export const getByRecoveryEmail = asyncHandler(async (req, res, next) => {
//     const { recoveryEmail } = req.query;
//     if (!recoveryEmail) {
//         return next( new AppError ("Recovery email is required!", 400))
//     }
//     const users = await userModel.find({ recoveryEmail }).select('-password');
//     if (users.length === 0) {
//         return next( new AppError ("No users found with the provided recovery email!", 404))
//     }
//     res.status(200).json({ message: 'Done', users });

// })


//========= update password =========//
// export const updatePassword = asyncHandler( async (req, res) => {
//     const { oldPassword, newPassword } = req.body;
//     if (!oldPassword || !newPassword) {
//         return next( new AppError ("Old password and new password are required!!", 400))
//     }
//         const user = await userModel.findById(req.user._id);
//         if (!user) {
//             return next( new AppError ("User not found", 400))
//         }
//         const isMatch = await bcrypt.compare(oldPassword, user.password);
//         if (!isMatch) {
//             return next( new AppError ("Incorrect old password", 401))
//         }
//         user.password = newPassword;
//         await user.save();
//         res.send({ message: 'Password updated successfully' });
// })



// =========== Logout ============//
// Real, server-side revocation — bumping sessionVersion invalidates this
// token (and any other copy of it, e.g. a second open tab/device) immediately,
// via the check in auth.js, instead of leaving it valid until its natural
// 7-day expiry. See PHASE3_SECURITY_SCOPE.md Finding 3 / ARCHITECTURE_DECISIONS.md.
export const logout = asyncHandler(async (req, res, next) => {
    await userModel.updateOne({ _id: req.user.id }, { $inc: { sessionVersion: 1 } });
    res.status(200).json({ message: 'Logged out successfully' });
});

// =========== Profile ============//
export const getProfile = asyncHandler(async (req, res, next) => {
    const user = await userModel.findById(req.user.id).select('-password');  
    if (!user) {
        return next(new AppError("Could not retrieve user profile!", 400));
    }
    res.status(200).json({ message: 'User profile fetched successfully', user });
});
