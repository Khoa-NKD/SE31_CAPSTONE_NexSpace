package base.api.shared.config;

import java.util.Locale;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.convert.converter.*;
import org.springframework.format.FormatterRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class CaseInsensitiveEnumConverterConfig implements WebMvcConfigurer {
  @Override
  public void addFormatters(FormatterRegistry registry) {
    registry.addConverterFactory(
        new ConverterFactory<String, Enum>() {
          @Override
          @SuppressWarnings({"rawtypes", "unchecked"})
          public <T extends Enum> Converter<String, T> getConverter(Class<T> type) {
            return source -> {
              if (source == null || source.isBlank()) return null;
              return (T)
                  Enum.valueOf(type, source.trim().replace('-', '_').toUpperCase(Locale.ROOT));
            };
          }
        });
  }
}
