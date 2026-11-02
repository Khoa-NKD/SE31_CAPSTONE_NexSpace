package base.api.feature.auth.service;

import base.api.feature.auth.dto.request.AuthRequest;
import base.api.feature.auth.dto.request.CompleteForgotPasswordDto;
import base.api.feature.auth.dto.request.RegisterDto;
import base.api.feature.auth.dto.response.AuthResponse;
import base.api.feature.auth.dto.response.UserDto;

public interface IAuthService {

    AuthResponse login(AuthRequest dto);

    void logout(String token);

    UserDto register(RegisterDto dto);

    void verifyEmail(String token);

    void resendVerificationEmail(String contactInfo);

    void initiateForgotPassword(String contactInfo);

    void completeForgotPassword(CompleteForgotPasswordDto dto);
}
