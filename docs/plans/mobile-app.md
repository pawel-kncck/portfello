# Plan: Mobile App

> **Status: Not planned for initial build.** The API-first architecture is designed with this in mind.

## Approach

Native iOS/Android app consuming the same REST API as the web app. The web app establishes the feature set; the mobile app is a client.

## Prerequisites

- API token authentication (per-user, long-lived) — needed so the mobile app doesn't rely on browser-based JWT sessions
- OpenAPI spec — for client code generation
- Stable API surface — the API is still evolving with planned features

## Scope

Not defined yet. Will likely start with:
- Expense entry (quick add)
- Expense list and search
- Push notifications for shared wallet activity
