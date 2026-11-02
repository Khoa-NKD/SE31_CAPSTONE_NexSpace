FROM maven:3.9-eclipse-temurin-17 AS build

WORKDIR /workspace

# Resolve dependencies in a separate layer so source-only changes rebuild faster.
COPY pom.xml ./
RUN mvn -B dependency:go-offline

COPY src ./src
RUN mvn -B clean package -DskipTests

FROM eclipse-temurin:17-jre-alpine AS runtime

RUN addgroup -S app && adduser -S app -G app

WORKDIR /app
COPY --from=build --chown=app:app /workspace/target/*.jar app.jar

USER app

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/v3/api-docs || exit 1

ENTRYPOINT ["java", "-jar", "/app/app.jar"]
