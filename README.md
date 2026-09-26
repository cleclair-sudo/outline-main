# McArthur Library Outline Wiki

This is a custom version of the open source Outline project. This is developed by Corie LeClair, please reach out at cleclair@mcarthurlibrary.org with any questions.

## Project Details 

This project is hosted using hosting platforms such as Elestio or Railway. Launching this includes using Redis & Postgres. The best way to use this in production is
by starting an Outline service on Elestio and then redirecting the Docker image to a customized Dockerfile (pulling from custom github repo) (found on this repo). 

## Outline Modifications (in testing)

- Added email notification buffer that must be enabled by setting BUFFER=True in the ENV
- Added email notification delay feature which allows from 5 minutes to 2 hours of delay
- [in development] Developing a "digest" feature to allow for several email updates to fit into one email update
- removed the "six hour" supress. Users will get updates regardless of if they have gotten  emails in the last six hours or not.
- added a log to show when emails are sent out for diag
- Added a user preference to not send email updates if they have seen the update already. By default, users will get email notifications regardless of if they saw it in the wiki or not. They can turn it off in notification settings
  
