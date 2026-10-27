package base.api.shared.config;

import jakarta.servlet.*;
import jakarta.servlet.http.*;
import java.io.IOException;
import java.util.UUID;
import java.util.concurrent.TimeUnit;
import java.util.regex.Pattern;
import lombok.extern.slf4j.Slf4j;
import org.slf4j.MDC;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Slf4j
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class RequestIdFilter extends OncePerRequestFilter {
  public static final String HEADER = "X-Request-ID";
  private static final Pattern SAFE_ID = Pattern.compile("[A-Za-z0-9][A-Za-z0-9._-]{0,99}");

  @Override
  protected void doFilterInternal(
      HttpServletRequest request, HttpServletResponse response, FilterChain chain)
      throws ServletException, IOException {
    String supplied = request.getHeader(HEADER);
    String id =
        supplied != null && SAFE_ID.matcher(supplied).matches()
            ? supplied
            : UUID.randomUUID().toString();
    var previous = MDC.getCopyOfContextMap();
    long start = System.nanoTime();
    MDC.put("requestId", id);
    response.setHeader(HEADER, id);
    try {
      chain.doFilter(request, response);
    } finally {
      // Do not log query strings, request bodies, Authorization or recovery tokens.
      log.info(
          "{} {} status={} durationMs={}",
          request.getMethod(),
          request.getRequestURI(),
          response.getStatus(),
          TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - start));
      if (previous == null) MDC.clear();
      else MDC.setContextMap(previous);
    }
  }
}
