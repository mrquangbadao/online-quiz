# Project Overview

## Stack
- Backend: Spring Boot 3.3, Java 17, Maven, JPA, Spring Security, Redis, Flyway, PostgreSQL.
- Frontend: React, Vite, TypeScript, Zustand, React Query, Axios.

## Current Structure
- Backend entrypoint: `backend/src/main/java/com/quiz/QuizApplication.java`
- Backend controllers: `backend/src/main/java/com/quiz/controller`
- Backend services: `backend/src/main/java/com/quiz/service`
- Backend repositories: `backend/src/main/java/com/quiz/repository`
- Backend migrations: `backend/src/main/resources/db/migration`
- Frontend routes and pages: `frontend/src/app`
- Frontend API clients: `frontend/src/api`
- Frontend stores: `frontend/src/store`

## Project Conventions
- Backend generally returns `ApiResponse`.
- Business validation belongs in service or validation layers, not controllers.
- Schema evolution goes through Flyway migrations.
- Frontend should reuse existing API client and store patterns before introducing new abstractions.

## Domain Notes
- This is a quiz/competition system with contestant registration, exams, phases, leaderboard, and admin screens.
- Anti-spam, CAPTCHA, OTP, and one-email-per-exam policies are planned in `docs/anti-spam-plan.md`.
