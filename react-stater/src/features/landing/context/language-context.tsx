import React, { createContext, useContext, useState, useMemo } from 'react';

export type Language = 'en' | 'vi';

export interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const TRANSLATIONS: Record<Language, Record<string, string>> = {
  en: {
    // Navbar
    'nav.solutions': 'Solutions',
    'nav.workspaces': 'Workspaces',
    'nav.platform': 'Platform',
    'nav.reviews': 'Impact & Reviews',
    'nav.resources': 'Resources',
    'nav.signIn': 'Sign In',
    'nav.listSpace': 'List Your Space',
    'nav.getStarted': 'Get Started',
    'nav.hostBadge': 'Host',

    // Solutions Menu
    'solutions.enterprise.title': 'Enterprise Workplace',
    'solutions.enterprise.desc': 'Scalable office portfolios & unified PayOS billing',
    'solutions.teams.title': 'Agile Hybrid Teams',
    'solutions.teams.desc': 'On-demand desks & private meeting suites',
    'solutions.landlords.title': 'Landlords & Operators',
    'solutions.landlords.desc': 'Monetize vacant commercial real estate assets',

    // Hero Section
    'hero.badge': 'NEXT-GEN WORKPLACE CLOUD & SPATIAL PLATFORM',
    'hero.title': 'Beyond flexible office space.',
    'hero.subtitle':
      'Global workspace access on demand. Simplify corporate governance. Continuously model and optimize your workplace strategy—all on one unified platform.',
    'hero.liveStatus': 'Instant Access Active — 48 spaces open nearby',
    'hero.trustedBy': 'POWERING HYBRID WORKPLACES FOR LEADING ENTERPRISES',

    // Search Card
    'search.hotDesk': 'Hot Desk',
    'search.dedicatedDesk': 'Dedicated Desk',
    'search.privateOffice': 'Private Office',
    'search.meetingRoom': 'Meeting Room',
    'search.locationLabel': 'City or Neighborhood',
    'search.locationDefault': 'District 1, Ho Chi Minh City',
    'search.dateLabel': 'Date & Hours',
    'search.dateDefault': 'Today, Flexible hours',
    'search.capacityLabel': 'Capacity',
    'search.capacityDefault': '1 - 4 People',
    'search.btn': 'Find Workspaces',
    'search.toastSearching': 'Searching available workspaces in',

    // Platform Layers
    'platform.badge': 'THE SMART OFFICE PLATFORM',
    'platform.title': 'One platform. Three layers.',
    'platform.subtitle':
      'Built to orchestrate your entire workplace strategy—from on-demand bookings to enterprise portfolio telemetry.',
    'platform.interactiveTour': 'Explore Interactive Architecture',
    'platform.layer1.title': 'Workspace Access',
    'platform.layer1.tag': 'Layer 1: On-Demand Real Estate',
    'platform.layer1.desc':
      'Global on-demand access to premier desks, meeting suites, and private serviced offices with zero rigid long-term commitments.',
    'platform.layer2.title': 'Workplace Operations',
    'platform.layer2.tag': 'Layer 2: PayOS Governance',
    'platform.layer2.desc':
      'Centralized billing, policy-driven spend controls, and automated compliance for distributed hybrid workforce teams.',
    'platform.layer3.title': 'Portfolio Strategy',
    'platform.layer3.tag': 'Layer 3: Predictive Analytics',
    'platform.layer3.desc':
      'Continuous telemetry on space density, cost-per-seat efficiency, and real estate ROI to model your true workplace footprint.',
    'platform.tourTitle': 'NexSpace Architecture Walkthrough',
    'platform.tourDesc':
      'A unified ecosystem designed for agility, financial governance, and portfolio intelligence.',
    'platform.close': 'Close Tour',

    // Marketplace Showcase
    'market.badge': 'LIVE NETWORK INVENTORY',
    'market.title': 'Better spaces in prime locations',
    'market.subtitle':
      'Real-time availability with verified acoustic isolation, ergonomic task seating, and enterprise connectivity.',
    'market.all': 'All Locations',
    'market.reserveBtn': 'Reserve Space',
    'market.landlordTitle': 'Are you a Commercial Landlord or Coworking Operator?',
    'market.landlordSubtitle':
      'List your inventory on the NexSpace Cloud Marketplace to access 5,000+ enterprise teams and eliminate vacancy.',
    'market.landlordBtn': 'List Your Space Today',

    // Testimonials
    'testimonials.badge': 'REAL RESULTS FROM REAL TEAMS',
    'testimonials.title': 'Proven enterprise impact.',
    'testimonials.subtitle':
      'From 38% lease cost reduction to seamless team collaboration, see why industry leaders ditch rigid leases for NexSpace.',
    'testimonials.all': 'All Stories',
    'testimonials.people': 'People & Culture',
    'testimonials.operations': 'Workplace Operations',
    'testimonials.cre': 'CRE & Finance',

    // Resources
    'resources.badge': 'HYBRID WORKPLACE RESEARCH',
    'resources.title': 'Resources to build better workspaces',
    'resources.subtitle':
      'Explore actionable frameworks, benchmarks, and tactical guides on agile real estate.',
    'resources.readArticle': 'Read article',

    // Enterprise CTA & ROI
    'cta.badge': 'ENTERPRISE WORKPLACE CONSULTATION',
    'cta.title': "Not sure where to start? Let's talk it through.",
    'cta.subtitle':
      'Our workplace advisors will analyze your headcount distribution and craft a custom flexible roadmap.',
    'cta.talkAdvisor': 'Talk to a Workplace Advisor',
    'cta.calcRoi': 'Calculate Lease ROI',
    'cta.roiModalTitle': 'Commercial Real Estate ROI Modeler',
    'cta.roiModalDesc':
      'Simulate your savings when shifting from traditional 5-year commercial leases to NexSpace.',
    'cta.teamSize': 'Team Size (Headcount)',
    'cta.leaseRate': 'Current Traditional Lease Cost / Desk / Mo',
    'cta.monthlyTraditional': 'Traditional Monthly Lease:',
    'cta.annualSavingsEst': 'Annual Projected Savings (38% Avg):',
    'cta.scheduleSession': 'Schedule Custom Strategy Session',

    // Footer
    'footer.tagline': 'The Cloud Workspace & Hybrid Office Operating System.',
    'footer.rights':
      'NexSpace Technologies Inc. All rights reserved. Commercial Real Estate Cloud & Marketplace.',

    // Auth
    'auth.backToHome': 'Back to home',
    'auth.signUp.title': 'Create an account',
    'auth.signUp.subtitle':
      'Enter your details below to create your NexSpace account and explore premium workspaces.',
    'auth.signUp.fullName': 'Full Name',
    'auth.signUp.fullName.ph': 'John Doe',
    'auth.signUp.email': 'Email Address',
    'auth.signUp.email.ph': 'name@company.com',
    'auth.signUp.password': 'Password',
    'auth.signUp.password.ph': '••••••••',
    'auth.signUp.confirmPassword': 'Confirm Password',
    'auth.signUp.agreeTerms.prefix': 'I agree to the',
    'auth.signUp.agreeTerms.tos': 'Terms of Service',
    'auth.signUp.agreeTerms.and': 'and',
    'auth.signUp.agreeTerms.privacy': 'Privacy Policy',
    'auth.signUp.subscribe': 'Subscribe to marketing emails',
    'auth.signUp.btn': 'Create account',
    'auth.signUp.alreadyHaveAccount': 'Already have an account?',
    'auth.signUp.signIn': 'Sign in',
    'auth.signUp.orContinue': 'Or continue with',
    'auth.signUp.google': 'Continue with Google',
    'auth.signUp.strength.weak': 'Weak',

    // Sign In
    'auth.signIn.title': 'Welcome back',
    'auth.signIn.subtitle': 'Sign in to manage your spaces, reservations, and teams.',
    'auth.signIn.email': 'Email Address',
    'auth.signIn.emailPlaceholder': 'you@company.com',
    'auth.signIn.password': 'Password',
    'auth.signIn.passwordPlaceholder': 'Enter your security credentials',
    'auth.signIn.rememberMe': 'Remember me for 30 days',
    'auth.signIn.forgotPassword': 'Forgot password?',
    'auth.signIn.btn': 'Sign In',
    'auth.signIn.orContinue': 'or continue with',
    'auth.signIn.google': 'Continue with Google',
    'auth.signIn.noAccount': "Don't have an account?",
    'auth.signIn.signUp': 'Sign up',
    'auth.signIn.error': 'Authentication failed',
    'auth.signIn.errorDesc': 'Invalid email or password. Please try again.',
    'auth.signUp.strength.fair': 'Fair',
    'auth.signUp.strength.good': 'Good',
    'auth.signUp.strength.strong': 'Strong',

    // Email Verification
    'auth.verify.support': 'Support',
    'auth.verify.platform': 'Commercial Real Estate Cloud',
    'auth.verify.title': 'Check your email',
    'auth.verify.subtitle': 'We’ve sent a 6-digit verification code to',
    'auth.verify.changeEmail': '(Change)',
    'auth.verify.expiresIn': 'Code expires in',
    'auth.verify.btn': 'Verify & Continue',
    'auth.verify.didNotReceive': 'Didn’t receive the code?',
    'auth.verify.resend': 'Resend',
    'auth.verify.trust': 'SOC-2 Type II Certified • 256-bit SSL Encryption',

    // Reset Password
    'auth.resetPassword.title': 'Reset password',
    'auth.resetPassword.subtitle': "Don't worry, we'll send you reset instructions.",
    'auth.resetPassword.email': 'Email',
    'auth.resetPassword.emailPlaceholder': 'you@company.com',
    'auth.resetPassword.requestBtn': 'Reset password',
    'auth.resetPassword.backToLogin': 'Back to log in',
    'auth.resetPassword.verifyTitle': 'Check your email',
    'auth.resetPassword.verifySubtitle': 'We sent a password reset link to',
    'auth.resetPassword.verifyBtn': 'Verify',
    'auth.resetPassword.resendText': "Didn't receive the email?",
    'auth.resetPassword.resendLink': 'Click to resend',
    'auth.resetPassword.newPasswordTitle': 'Set new password',
    'auth.resetPassword.newPasswordSubtitle':
      'Your new password must be different from previous used passwords.',
    'auth.resetPassword.password': 'Password',
    'auth.resetPassword.passwordPlaceholder': '••••••••',
    'auth.resetPassword.confirmPassword': 'Confirm Password',
    'auth.resetPassword.confirmPasswordPlaceholder': '••••••••',
    'auth.resetPassword.updateBtn': 'Reset password',
    'auth.resetPassword.successTitle': 'Password reset',
    'auth.resetPassword.successSubtitle':
      'Your password has been successfully reset. Click below to log in magically.',
    'auth.resetPassword.successBtn': 'Continue'
  },
  vi: {
    // Navbar
    'nav.solutions': 'Giải pháp',
    'nav.workspaces': 'Không gian',
    'nav.platform': 'Nền tảng',
    'nav.reviews': 'Đánh giá & Hiệu quả',
    'nav.resources': 'Tài nguyên',
    'nav.signIn': 'Đăng nhập',
    'nav.listSpace': 'Cho thuê không gian',
    'nav.getStarted': 'Bắt đầu ngay',
    'nav.hostBadge': 'Đối tác',

    // Solutions Menu
    'solutions.enterprise.title': 'Văn phòng Doanh nghiệp',
    'solutions.enterprise.desc': 'Tối ưu danh mục văn phòng & hệ thống thanh toán PayOS tập trung',
    'solutions.teams.title': 'Đội nhóm Agile Hybrid',
    'solutions.teams.desc': 'Đặt bàn làm việc linh hoạt & phòng họp riêng theo giờ',
    'solutions.landlords.title': 'Chủ tòa nhà & Vận hành',
    'solutions.landlords.desc': 'Khai thác và lấp đầy mặt bằng bất động sản thương mại',

    // Hero Section
    'hero.badge': 'HỆ ĐIỀU HÀNH KHÔNG GIAN LÀM VIỆC ĐIỆN TOÁN ĐÁM MÂY THẾ HỆ MỚI',
    'hero.title': 'Vượt xa khái niệm văn phòng linh hoạt thông thường.',
    'hero.subtitle':
      'Tiếp cận mạng lưới không gian làm việc toàn cầu theo yêu cầu. Đơn giản hóa quản trị ngân sách và tối ưu hóa chiến lược danh mục bất động sản—tất cả trên một nền tảng hợp nhất.',
    'hero.liveStatus': 'Mạng lưới sẵn sàng — 48 địa điểm đang mở gần bạn',
    'hero.trustedBy': 'ĐỒNG HÀNH CÙNG CÁC TẬP ĐOÀN HÀNG ĐẦU',

    // Search Card
    'search.hotDesk': 'Bàn làm việc linh hoạt',
    'search.dedicatedDesk': 'Bàn làm việc cố định',
    'search.privateOffice': 'Văn phòng riêng',
    'search.meetingRoom': 'Phòng họp cao cấp',
    'search.locationLabel': 'Khu vực / Thành phố',
    'search.locationDefault': 'Quận 1, TP. Hồ Chí Minh',
    'search.dateLabel': 'Thời gian đặt chỗ',
    'search.dateDefault': 'Hôm nay, Giờ linh hoạt',
    'search.capacityLabel': 'Quy mô số người',
    'search.capacityDefault': '1 - 4 Người',
    'search.btn': 'Tìm kiếm không gian',
    'search.toastSearching': 'Đang tìm kiếm không gian làm việc khả dụng tại',

    // Platform Layers
    'platform.badge': 'NỀN TẢNG VĂN PHÒNG THÔNG MINH',
    'platform.title': 'Một nền tảng. Ba tầng kiến trúc.',
    'platform.subtitle':
      'Được thiết kế để chỉ huy toàn diện chiến lược không gian làm việc của bạn—từ đặt chỗ tức thì đến dữ liệu phân tích danh mục bất động sản.',
    'platform.interactiveTour': 'Khám phá kiến trúc tương tác',
    'platform.layer1.title': 'Tiếp cận không gian',
    'platform.layer1.tag': 'Tầng 1: Bất động sản theo yêu cầu',
    'platform.layer1.desc':
      'Tiếp cận tức thì mạng lưới bàn làm việc, phòng họp và văn phòng trọn gói cao cấp mà không bị ràng buộc hợp đồng dài hạn.',
    'platform.layer2.title': 'Vận hành văn phòng',
    'platform.layer2.tag': 'Tầng 2: Quản trị tài chính PayOS',
    'platform.layer2.desc':
      'Hóa đơn tập trung, kiểm soát ngân sách theo chính sách công ty và tự động hóa tuân thủ cho đội ngũ nhân sự làm việc phân tán.',
    'platform.layer3.title': 'Chiến lược danh mục',
    'platform.layer3.tag': 'Tầng 3: Phân tích dự báo thông minh',
    'platform.layer3.desc':
      'Theo dõi liên tục mật độ sử dụng mặt bằng, chi phí trên mỗi nhân sự và ROI để mô hình hóa quy mô văn phòng tối ưu nhất.',
    'platform.tourTitle': 'Kiến trúc chi tiết hệ thống NexSpace',
    'platform.tourDesc':
      'Hệ sinh thái đồng nhất được thiết kế cho tính linh hoạt, kỷ luật tài chính và dữ liệu thời gian thực.',
    'platform.close': 'Đóng xem',

    // Marketplace Showcase
    'market.badge': 'MẠNG LƯỚI KHÔNG GIAN THỰC TẾ',
    'market.title': 'Không gian đẳng cấp tại các vị trí đắc địa',
    'market.subtitle':
      'Khả năng đặt chỗ thời gian thực với tiêu chuẩn cách âm chuẩn hóa, bàn làm việc công thái học và kết nối internet tốc độ cao.',
    'market.all': 'Tất cả địa điểm',
    'market.reserveBtn': 'Đặt chỗ ngay',
    'market.landlordTitle': 'Bạn là Chủ tòa nhà hoặc Không gian Co-working?',
    'market.landlordSubtitle':
      'Đưa không gian của bạn lên NexSpace Marketplace để tiếp cận hơn 5,000+ doanh nghiệp đa quốc gia và tối ưu hóa dòng tiền cho thuê.',
    'market.landlordBtn': 'Đăng ký đối tác cho thuê',

    // Testimonials
    'testimonials.badge': 'HIỆU QUẢ ĐÃ ĐƯỢC CHỨNG MINH',
    'testimonials.title': 'Tác động thực tế cho các tập đoàn hàng đầu',
    'testimonials.subtitle':
      'Từ việc cắt giảm 38% chi phí thuê truyền thống đến tăng cường gắn kết đội ngũ, xem lý do vì sao các lãnh đạo lựa chọn NexSpace.',
    'testimonials.all': 'Tất cả câu chuyện',
    'testimonials.people': 'Nhân sự & Văn hóa',
    'testimonials.operations': 'Vận hành & Kế toán',
    'testimonials.cre': 'Bất động sản & Tài chính',

    // Resources
    'resources.badge': 'KIẾN THỨC & XU HƯỚNG',
    'resources.title': 'Dữ liệu & Cẩm nang cho nơi làm việc tương lai',
    'resources.subtitle':
      'Khám phá các báo cáo phân tích, nghiên cứu xu hướng làm việc linh hoạt và hướng dẫn tối ưu danh mục bất động sản năm 2026.',
    'resources.readArticle': 'Đọc bài viết',

    // Enterprise CTA & ROI
    'cta.badge': 'TƯ VẤN DOANH NGHIỆP',
    'cta.title': 'Chưa biết bắt đầu từ đâu? Hãy cùng chuyên gia trao đổi.',
    'cta.subtitle':
      'Các chuyên gia chiến lược bất động sản của NexSpace sẽ phân tích dữ liệu quy mô nhân sự và thiết kế giải pháp không gian tối ưu nhất.',
    'cta.talkAdvisor': 'Đặt lịch tư vấn chuyên gia',
    'cta.calcRoi': 'Tính toán tiết kiệm chi phí (ROI)',
    'cta.roiModalTitle': 'Mô hình tính toán ROI Bất động sản Thương mại',
    'cta.roiModalDesc':
      'Mô phỏng khoản chi phí bạn sẽ tiết kiệm khi chuyển từ hợp đồng thuê cố định 5 năm sang giải pháp NexSpace.',
    'cta.teamSize': 'Quy mô đội ngũ (Số lượng nhân sự)',
    'cta.leaseRate': 'Chi phí thuê văn phòng truyền thống / bàn / tháng',
    'cta.monthlyTraditional': 'Chi phí thuê cố định hàng tháng:',
    'cta.annualSavingsEst': 'Ước tính tiết kiệm hàng năm (Trung bình 38%):',
    'cta.scheduleSession': 'Lên lịch tư vấn chiến lược chuyên sâu',

    // Footer
    'footer.tagline':
      'Hệ điều hành không gian làm việc đám mây & Sàn giao dịch bất động sản thương mại.',
    'footer.rights':
      'NexSpace Technologies Inc. Bảo lưu mọi quyền. Đám mây & Sàn giao dịch Bất động sản Thương mại.',

    // Auth
    'auth.backToHome': 'Về trang chủ',
    'auth.signUp.title': 'Tạo tài khoản',
    'auth.signUp.subtitle':
      'Nhập thông tin chi tiết dưới đây để tạo tài khoản NexSpace và khám phá các không gian làm việc cao cấp.',
    'auth.signUp.fullName': 'Họ và Tên',
    'auth.signUp.fullName.ph': 'Nguyễn Văn A',
    'auth.signUp.email': 'Địa chỉ Email',
    'auth.signUp.email.ph': 'ten@congty.com',
    'auth.signUp.password': 'Mật khẩu',
    'auth.signUp.password.ph': '••••••••',
    'auth.signUp.confirmPassword': 'Xác nhận Mật khẩu',
    'auth.signUp.agreeTerms.prefix': 'Tôi đồng ý với',
    'auth.signUp.agreeTerms.tos': 'Điều khoản Dịch vụ',
    'auth.signUp.agreeTerms.and': 'và',
    'auth.signUp.agreeTerms.privacy': 'Chính sách Bảo mật',
    'auth.signUp.subscribe': 'Đăng ký nhận email tiếp thị',
    'auth.signUp.btn': 'Tạo tài khoản',
    'auth.signUp.alreadyHaveAccount': 'Đã có tài khoản?',
    'auth.signUp.signIn': 'Đăng nhập',
    'auth.signUp.orContinue': 'Hoặc tiếp tục với',
    'auth.signUp.google': 'Tiếp tục với Google',
    'auth.signUp.strength.weak': 'Yếu',

    // Sign In
    'auth.signIn.title': 'Chào mừng trở lại',
    'auth.signIn.subtitle': 'Đăng nhập để quản lý không gian, đặt chỗ và đội ngũ của bạn.',
    'auth.signIn.email': 'Địa chỉ Email',
    'auth.signIn.emailPlaceholder': 'bạn@congty.com',
    'auth.signIn.password': 'Mật khẩu',
    'auth.signIn.passwordPlaceholder': 'Nhập mật khẩu an toàn',
    'auth.signIn.rememberMe': 'Ghi nhớ đăng nhập trong 30 ngày',
    'auth.signIn.forgotPassword': 'Quên mật khẩu?',
    'auth.signIn.btn': 'Đăng nhập',
    'auth.signIn.orContinue': 'hoặc tiếp tục với',
    'auth.signIn.google': 'Tiếp tục với Google',
    'auth.signIn.noAccount': 'Chưa có tài khoản?',
    'auth.signIn.signUp': 'Đăng ký',
    'auth.signIn.error': 'Lỗi xác thực',
    'auth.signIn.errorDesc': 'Email hoặc mật khẩu không hợp lệ. Vui lòng thử lại.',
    'auth.signUp.strength.fair': 'Trung bình',
    'auth.signUp.strength.good': 'Tốt',
    'auth.signUp.strength.strong': 'Mạnh',

    // Email Verification
    'auth.verify.support': 'Hỗ trợ',
    'auth.verify.platform': 'Nền tảng Đám mây Bất động sản Thương mại',
    'auth.verify.title': 'Kiểm tra hộp thư của bạn',
    'auth.verify.subtitle': 'Chúng tôi đã gửi mã xác thực 6 số đến',
    'auth.verify.changeEmail': '(Thay đổi)',
    'auth.verify.expiresIn': 'Mã sẽ hết hạn sau',
    'auth.verify.btn': 'Xác thực & Tiếp tục',
    'auth.verify.didNotReceive': 'Chưa nhận được mã?',
    'auth.verify.resend': 'Gửi lại',
    'auth.verify.trust': 'Chứng nhận SOC-2 Type II • Mã hoá 256-bit SSL',

    // Reset Password
    'auth.resetPassword.title': 'Khôi phục mật khẩu',
    'auth.resetPassword.subtitle': 'Đừng lo, chúng tôi sẽ gửi hướng dẫn khôi phục cho bạn.',
    'auth.resetPassword.email': 'Email',
    'auth.resetPassword.emailPlaceholder': 'bạn@côngty.com',
    'auth.resetPassword.requestBtn': 'Khôi phục mật khẩu',
    'auth.resetPassword.backToLogin': 'Quay lại đăng nhập',
    'auth.resetPassword.verifyTitle': 'Kiểm tra hộp thư',
    'auth.resetPassword.verifySubtitle': 'Chúng tôi đã gửi mã xác nhận tới',
    'auth.resetPassword.verifyBtn': 'Xác thực',
    'auth.resetPassword.resendText': 'Không nhận được email?',
    'auth.resetPassword.resendLink': 'Gửi lại',
    'auth.resetPassword.newPasswordTitle': 'Thiết lập mật khẩu mới',
    'auth.resetPassword.newPasswordSubtitle':
      'Mật khẩu mới của bạn phải khác với các mật khẩu đã sử dụng trước đó.',
    'auth.resetPassword.password': 'Mật khẩu',
    'auth.resetPassword.passwordPlaceholder': '••••••••',
    'auth.resetPassword.confirmPassword': 'Xác nhận mật khẩu',
    'auth.resetPassword.confirmPasswordPlaceholder': '••••••••',
    'auth.resetPassword.updateBtn': 'Cập nhật mật khẩu',
    'auth.resetPassword.successTitle': 'Khôi phục thành công',
    'auth.resetPassword.successSubtitle':
      'Mật khẩu của bạn đã được khôi phục thành công. Nhấn nút bên dưới để đăng nhập.',
    'auth.resetPassword.successBtn': 'Tiếp tục'
  }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('nexspace_lang');
        if (saved === 'en' || saved === 'vi') {
          return saved;
        }
      } catch {
        // ignore
      }
    }
    return 'vi';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem('nexspace_lang', lang);
    } catch {
      // ignore
    }
  };

  const t = useMemo(() => {
    return (key: string): string => {
      const dict = TRANSLATIONS[language] || TRANSLATIONS.vi;
      return dict[key] || TRANSLATIONS.en[key] || key;
    };
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
