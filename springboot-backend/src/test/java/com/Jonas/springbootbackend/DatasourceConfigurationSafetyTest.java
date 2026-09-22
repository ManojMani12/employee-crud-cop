package com.Jonas.springbootbackend;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.stream.Stream;
import org.junit.jupiter.api.Assumptions;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

class DatasourceConfigurationSafetyTest {

    private static final String SECRET_PASSWORD = "test-only-secret";
    private static final String TEST_USERNAME = "test-user";

    private final ApplicationContextRunner contextRunner = new ApplicationContextRunner()
            .withUserConfiguration(Application.class)
            .withPropertyValues(
                    "spring.datasource.url=${DB_URL}",
                    "spring.datasource.username=${DB_USERNAME}",
                    "spring.datasource.password=${DB_PASSWORD}",
                    "spring.datasource.driver-class-name=com.mysql.cj.jdbc.Driver",
                    "spring.autoconfigure.exclude=org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration");

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
                    assertSafeFailure(context.getStartupFailure(), SECRET_PASSWORD, "test-user");
                });
    }

    @Test
    void missingDatabaseUsernameFailsWithoutExposingPassword() {
        contextRunner
                .withPropertyValues(
                        "DB_URL=jdbc:mysql://localhost:3306/test",
                        "DB_PASSWORD=" + SECRET_PASSWORD)
                .run(context -> {
                    assertThat(context).hasFailed();
                    assertSafeFailure(context.getStartupFailure(), SECRET_PASSWORD, "jdbc:mysql://localhost:3306/test");
                });
    }

    @Test
    void missingDatabasePasswordFailsWithoutExposingPassword() {
        contextRunner
                .withPropertyValues(
                        "DB_URL=jdbc:mysql://localhost:3306/test",
                        "DB_USERNAME=" + TEST_USERNAME)
                .run(context -> {
                    assertThat(context).hasFailed();
                    assertSafeFailure(context.getStartupFailure(), TEST_USERNAME, "jdbc:mysql://localhost:3306/test");
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
                    assertSafeFailure(context.getStartupFailure(), SECRET_PASSWORD, "not-a-jdbc-url", "test-user");
                });
    }

    @Test
    void h2DriverWithoutTestProfileStillRequiresDatabasePassword() {
        contextRunner
                .withPropertyValues(
                        "spring.datasource.driver-class-name=org.h2.Driver",
                        "DB_URL=jdbc:h2:mem:driver_override",
                        "DB_USERNAME=test-user")
                .run(context -> {
                    assertThat(context).hasFailed();
                    assertThat(context.getStartupFailure()).hasMessageContaining("DB_PASSWORD");
                });
    }

    @Test
    void processEnvironmentVariablesResolveWhenProvided() {
        String databaseUrl = System.getenv("DB_URL");
        String databaseUsername = System.getenv("DB_USERNAME");
        String databasePassword = System.getenv("DB_PASSWORD");
        Assumptions.assumeTrue(Stream.of(databaseUrl, databaseUsername, databasePassword).allMatch(this::hasText));

        new ApplicationContextRunner()
                .withUserConfiguration(Application.class)
                .withPropertyValues(
                        "spring.datasource.url=${DB_URL}",
                        "spring.datasource.username=${DB_USERNAME}",
                        "spring.datasource.password=${DB_PASSWORD}",
                        "spring.datasource.driver-class-name=com.mysql.cj.jdbc.Driver")
                .run(context -> assertThat(context).isNotNull());
    }

    private void assertSafeFailure(Throwable failure, String... forbiddenValues) {
        assertThat(failure).isNotNull();
        Throwable current = failure;
        while (current != null) {
            for (String forbiddenValue : forbiddenValues) {
                assertThat(current.getMessage()).doesNotContain(forbiddenValue);
            }
            current = current.getCause();
        }
    }

    private boolean hasText(String value) {
        return value != null && !value.trim().isEmpty();
    }
}