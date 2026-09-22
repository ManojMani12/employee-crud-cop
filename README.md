# CRUD Employee

![Homepage](https://user-images.githubusercontent.com/67349235/175102934-8f73ce8b-6d32-4953-bf93-b0ea9aa97f38.png)

![UML Diagram](https://user-images.githubusercontent.com/67349235/175102037-241c1dc7-1538-4743-a2fc-4b5c2ea21b55.png)

This is a full-stack project that combines Spring Boot for the back-end and React.js for the front-end. The application utilizes a MySQL database.

## Project Description

The CRUD Employee app provides a user-friendly interface for managing employee data. The homepage displays a list of all employees, and users can perform operations such as creating new employees, updating existing employee information, and deleting employees.

## Technologies Used

### Back-end
- JDK 11
- Spring Boot
- Maven
- Embedded Tomcat
- MySQL
- Postman

### Front-end
- HTML
- CSS
- JavaScript
- Yarn
- Node.js
- React.js
- React Hooks
- Bootstrap 5
- Axios
- VS Code

## Backend Database Configuration

The backend requires database settings at runtime. Do not place database credentials in tracked files, commit them, or print them in logs.

Set these environment variables before starting the backend locally:

```text
DB_URL=jdbc:mysql://<host>:<port>/<database>?useSSL=false
DB_USERNAME=<database-username>
DB_PASSWORD=<database-password>
```

On Windows PowerShell, for example:

```powershell
Set-Location .\springboot-backend
$env:DB_URL = "jdbc:mysql://<host>:<port>/<database>?useSSL=false"
$env:DB_USERNAME = "<database-username>"
$env:DB_PASSWORD = "<database-password>"
.\mvnw.cmd spring-boot:run
```

Replace each placeholder with a value supplied through your local environment. Do not add the resulting values to `application.properties`, documentation, source code, or committed build output.

Automated tests use the existing H2 in-memory configuration in `springboot-backend/src/test/resources/application.properties` and do not require the production database variables. Production deployments must provide `DB_URL`, `DB_USERNAME`, and `DB_PASSWORD` through their environment or deployment configuration before starting the service.

If a required variable is missing or invalid, the backend fails during startup. Diagnostics may identify the missing variable or a safe failure category, but must not expose passwords, usernames, complete JDBC URLs, connection strings, or unfiltered nested database errors.