package com.Jonas.springbootbackend;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

class DatasourceConfigurationSafetyTest {

    private static final String SECRET_PASSWORD = "test-only-secret";

    private final ApplicationContextRunner contextRunner = new ApplicationContextRunner()
            .withUserConfiguration(Application.class)
            .withPropertyValues(
                    "spring.datasource.url=${DB_URL}",
                    "spring.datasource.username=${DB_USERNAME}",
                    "spring.datasource.password=${DB_PASSWORD}",
                    "spring.datasource.driver-class-name=com.mysql.cj.jdbc.Driver");

    @Test
    void mainConfigurationRequiresAllDatabaseEnvironmentVariables() throws IOException {
        Path propertiesPath = Paths.get("src", "main", "resources", "application.properties");
        String properties = Files.readString(propertiesPath, StandardCharsets.UTF_8);

        assertThat(properties)
                .contains("spring.datasource.url=${DB_URL}")
                .contains("spring.datasource.username=${DB_USERNAME}")
                .contains("spring.datasource.password=${DB_PASSWORD}");
    }

    @Test
    void missingDatabaseUrlFailsWithoutExposingPassword() {
        contextRunner
                .withPropertyValues(
                        "DB_USERNAME=test-user",
                        "DB_PASSWORD=" + SECRET_PASSWORD)
                .run(context -> {
                    assertThat(context).hasFailed();
                    assertThat(context.getStartupFailure()).hasMessageNotContaining(SECRET_PASSWORD);
                });
    }

    @Test
    void missingDatabaseUsernameFailsWithoutExposingPassword() {
        contextRunner
                .withPropertyValues(
                        "DB_URL=jdbc:h2:mem:missing_username",
                        "DB_PASSWORD=" + SECRET_PASSWORD)
                .run(context -> {
                    assertThat(context).hasFailed();
                    assertThat(context.getStartupFailure()).hasMessageNotContaining(SECRET_PASSWORD);
                });
    }

    @Test
    void missingDatabasePasswordFailsWithoutExposingPassword() {
        contextRunner
                .withPropertyValues(
                        "DB_URL=jdbc:h2:mem:missing_password",
                        "DB_USERNAME=test-user")
                .run(context -> {
                    assertThat(context).hasFailed();
                    assertThat(context.getStartupFailure()).hasMessageNotContaining(SECRET_PASSWORD);
                });
    }

    @Test
    void malformedDatabaseUrlFailsWithoutExposingPassword() {
        contextRunner
                .withPropertyValues(
                        "DB_URL=not-a-jdbc-url",
                        "DB_USERNAME=test-user",
                        "DB_PASSWORD=" + SECRET_PASSWORD)
                .run(context -> {
                    assertThat(context).hasFailed();
                    assertThat(context.getStartupFailure()).hasMessageNotContaining(SECRET_PASSWORD);
                });
    }
}