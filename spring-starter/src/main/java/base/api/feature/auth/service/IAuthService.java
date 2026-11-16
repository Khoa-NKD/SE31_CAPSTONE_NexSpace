package base.api.feature.auth.service;

import base.api.feature.auth.dto.request.AuthRequest;
import base.api.feature.auth.dto.request.CompleteForgotPasswordDto;
import base.api.feature.auth.dto.request.GoogleAuthRequestDto;
import base.api.feature.auth.dto.request.RegisterDto;
import base.api.feature.auth.dto.response.AuthResponse;
import base.api.feature.auth.dto.response.GoogleAuthResponseDto;
import base.api.feature.auth.dto.response.TokenValidationResponseDto;
import base.api.feature.auth.dto.response.UserDto;

public interface IAuthService {

    AuthResponse login(AuthRequest dto);

    GoogleAuthResponseDto loginWithGoogle(GoogleAuthRequestDto dto);

    void logout(String token);

    UserDto register(RegisterDto dto);

    String verifyEmail(String token);

    AuthResponse verifyEmailAndIssueToken(String token);

    void verifyEmailDirect(String token);

    void resendVerificationEmail(String contactInfo);

    void initiateForgotPassword(String contactInfo);

    TokenValidationResponseDto validateResetToken(String token);

    void completeForgotPassword(CompleteForgotPasswordDto dto);

    boolean isAccountVerified(String contactInfo);
}
