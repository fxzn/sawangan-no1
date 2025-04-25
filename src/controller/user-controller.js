import userService from '../service/user-service.js';
import { googleAuthValidation, userUuidValidation } from '../validation/user-validation.js';
import { validate } from '../validation/validation.js';

export const register = async (req, res, next) => {
  try {
    
    const user = await userService.register(req.body);
    
    res.status(201).json({
      data: user
    });
  } catch (error) {
    next(error);
  }
};


export const login = async (req, res, next) => {
  try {
    
    // Dapatkan hasil login termasuk token
    const loginData = await userService.login(req.body);
    
    res.status(200).json({
      data: loginData // Kirim seluruh response termasuk token
    });
  } catch (error) {
    next(error);
  }
};

export const loginAdmin = async (req, res, next) => {
  try {
  
    const loginData = await userService.loginAdmin(req.body);
    res.status(200).json({
      data: loginData
    });
  } catch (error) {
    next(error);
  }
};


export const logout = async (req, res, next) => {
  try {
    const result = await userService.logout(req.user.id);
    
    // Format response sesuai kebutuhan
    res.status(200).json({
      data: {
        id: result.id,
        message: result.message
      }
    });
  } catch (error) {
    next(error);
  }
};



export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    await userService.forgotPassword(email);
    res.status(200).json({
      message: "Password reset link sent to email"
    });
  } catch (error) {
    next(error);
  }
};


export const resetPassword = async (req, res, next) => {
  try {
    const { token, password, confirmPassword } = req.body;
    await userService.resetPassword(token, password, confirmPassword);
    res.status(200).json({
      message: "Password reset successful"
    });
  } catch (error) {
    next(error);
  }
};


export const googleAuth = async (req, res, next) => {
  try {
    const { token } = await googleAuthValidation.validateAsync(req.body);
    const data = await userService.googleAuth(token);
    
    res.status(200).json({
      data
    });
  } catch (error) {
    next(error);
  }
};



export const getAllUsersForAdmin = async (req, res, next) => {
  try {
    const users = await userService.getAllUsersForAdmin();
    res.status(200).json({
      success: true,
      data: users
    });
  } catch (error) {
    next(error);
  }
};



export const getProfile = async (req, res, next) => {
  try {
    const user = await userService.getUserProfile(req.user.id);
    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};


export const updateProfile = async (req, res, next) => {
  try {
    const data = await userService.updateProfile(req.user.id, req.body);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};



export const uploadAvatar = async (req, res, next) => {
  try {
    if (!req.file) {
      throw new ResponseError(400, 'Avatar file is required');
    }

    const result = await userService.updateAvatar(req.user.id, req.file);
    
    res.status(200).json({
      success: true,
      data: {
        avatarUrl: result.avatar
      }
    });
  } catch (error) {
    // Cleanup jika error terjadi
    if (req.file?.public_id) {
      await cloudinary.uploader.destroy(req.file.public_id);
    }
    next(error);
  }
};


// export const uploadAvatar = async (req, res, next) => {
//   try {
//     if (!req.file) {
//       throw new ResponseError(400, 'Avatar file is required');
//     }

//     const result = await userService.updateAvatar(req.user.id, req.file);
    
//     res.status(200).json({
//       success: true,
//       data: {
//         avatarUrl: result.avatar
//       }
//     });
//   } catch (error) {
//     // Cleanup jika error terjadi
//     if (req.file?.path && fs.existsSync(req.file.path)) {
//       fs.unlinkSync(req.file.path);
//     }
//     next(error);
//   }
// };


export const changePassword = async (req, res, next) => {
  try {
    await userService.changePassword(
      req.user.id, 
      req.body.currentPassword,
      req.body.newPassword,
      req.body.confirmPassword
    );
    res.json({ success: true, message: "Password updated" });
  } catch (error) {
    next(error);
  }
};

export const deleteUser = async (req, res, next) => {
  try {
    const userId = validate(userUuidValidation, req.params.id);
    await userService.deleteUser(userId);
    
    res.status(200).json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};



