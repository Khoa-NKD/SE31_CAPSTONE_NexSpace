package base.api.shared.config;

import java.util.concurrent.Executor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

@Configuration
@EnableAsync
public class AsyncConfig {

  @Bean("emailExecutor")
  public Executor emailExecutor() {
    ThreadPoolTaskExecutor exec = new ThreadPoolTaskExecutor();
    exec.setCorePoolSize(2);
    exec.setMaxPoolSize(5);
    exec.setQueueCapacity(100);
    exec.setThreadNamePrefix("email-");
    exec.setTaskDecorator(
        task -> {
          var caller = org.slf4j.MDC.getCopyOfContextMap();
          return () -> {
            var previous = org.slf4j.MDC.getCopyOfContextMap();
            try {
              if (caller == null) org.slf4j.MDC.clear();
              else org.slf4j.MDC.setContextMap(caller);
              task.run();
            } finally {
              if (previous == null) org.slf4j.MDC.clear();
              else org.slf4j.MDC.setContextMap(previous);
            }
          };
        });
    exec.initialize();
    return exec;
  }
}
