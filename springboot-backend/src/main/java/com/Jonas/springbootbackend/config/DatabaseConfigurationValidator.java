package com.Jonas.springbootbackend.config;

import java.util.ArrayList;
import java.util.List;
import javax.annotation.PostConstruct;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.stereotype.Component;

@Component
public class DatabaseConfigurationValidator {

    private final Environment environment;

    public DatabaseConfigurationValidator(Environment environment) {
        this.environment = environment;
    }

    @PostConstruct
    void validate() {
        if (environment.acceptsProfiles(Profiles.of("test"))) {
            return;
        }

        List<String> missingVariables = new ArrayList<>();
        addIfBlank(missingVariables, "DB_URL");
        addIfBlank(missingVariables, "DB_USERNAME");
        addIfBlank(missingVariables, "DB_PASSWORD");

        if (!missingVariables.isEmpty()) {
            throw new IllegalStateException(
                    "Missing required database environment variable(s): " + String.join(", ", missingVariables));
        }

        String databaseUrl = environment.getProperty("DB_URL");
        if (!databaseUrl.startsWith("jdbc:mysql://")) {
            throw new IllegalStateException("Invalid DB_URL format; expected a MySQL JDBC URL");
        }
    }

    private void addIfBlank(List<String> missingVariables, String variableName) {
        if (!hasText(environment.getProperty(variableName))) {
            missingVariables.add(variableName);
        }
    }

    private boolean hasText(String value) {
        return value != null && !value.trim().isEmpty();
    }
}