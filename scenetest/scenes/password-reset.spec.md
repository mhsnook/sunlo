# the login page links to the forgot-password form

visitor:

- openTo /login
- see login-forgot-password-link
- click login-forgot-password-link
- up
- see forgot-password-form
- see email-input
- see submit-button

# set-new-password without a recovery session shows the invalid-link card

visitor:

- openTo /set-new-password
- up
- see reset-link-invalid
- see request-new-link
- notSee password-reset-form

# an expired recovery link surfaces the error instead of a doomed form

visitor:

- openTo /set-new-password#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired
- up
- see reset-link-invalid
- seeText Email link is invalid or has expired
- notSee password-reset-form
