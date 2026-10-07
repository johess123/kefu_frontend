# Inbox draft auto-size design

## Goal

Display every manual-review AI draft in full without an internal vertical scrollbar, while preserving draft editing, the yellow review treatment, and the discard/send controls.

## Scope

- Change only `kefu_frontend/`.
- Update the draft editor in `src/components/InboxView.jsx`.
- Keep the existing message-list scrolling behavior.
- Do not add a maximum height to the draft editor.

## Design

The draft remains a controlled `textarea`. A small reusable auto-sizing textarea implementation will reset its height to `auto` and then set it to its `scrollHeight` whenever its value changes. This makes the initial draft content fully visible and keeps the field expanded as an operator edits it.

The amber review container, editable state, character limit, disabled state, images, and action buttons remain unchanged. Only the textarea's sizing behavior changes; overflow belongs to the surrounding conversation list instead of the textarea.

## Verification

- Confirm a multi-line draft renders at its full content height with no inner vertical scrollbar.
- Confirm editing to add or remove lines updates the height.
- Confirm the frontend production build succeeds.
