# McArthur Library Outline Wiki

This is a custom version of the open source Outline project. This is developed by Corie LeClair, please reach out at cleclair@mcarthurlibrary.org with any questions.

## Project Details 

This project is hosted using hosting platforms such as Elestio or Railway. Launching this includes using Redis & Postgres. The best way to use this in production is
by starting an Outline service on Elestio and then changing the wk-outline image definition in the Docker file on the server to point to this (or a custom Github Repo). You may also need to find an alternative to Minio (the image-file built into Elestio contains a special version of Minio that is unavailable after changing images)/

## Outline Modifications (in testing)

- Added email notification digest feature which will allow users to receive email updates on intervals they select.
- Removed the "six hour" suppress. Users will get updates regardless of if they have gotten  emails in the last six hours or not.
- Adjusted "Non significant" email notification suppression to be more sensitive as for what to send. 
- Added a log to show when emails are sent out for diag
- Added a user preference to not send email updates if they have seen the update already. By default, users will get email notifications regardless of if they saw it in the wiki or not. They can turn it off in notification settings
- Remove junk connection messages from debug=info, Set LOG_LEVEL=debug if you ever need to see the connection messages again.
- Added LOG codes to say what messages, users & times notifications are sent. This can likely be removed when done with extended testing.
  
