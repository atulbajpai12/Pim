# Pim
You can use Docker to set up a new Pimcore Installation. You don't need to have a PHP environment with composer installed.

Prerequisits
Your user must be allowed to run docker commands (directly or via sudo).
You must have docker-compose installed.
Your user must be allowed to change file permissions (directly or via sudo).
Follow these steps
Initialize the skeleton project using the pimcore/pimcore image docker run -u `id -u`:`id -g` --rm -v `pwd`:/var/www/html pimcore/pimcore:PHP8.1-fpm composer create-project pimcore/skeleton service_master

Go to your new project cd service_master/

Part of the new project is a docker compose file

# Run echo `id -u`:`id -g` to retrieve your local user and group id
# Open the docker-compose.yml file in an editor, uncomment all the user: '1000:1000' lines and update the ids if necessary
Start the needed services with docker-compose up -d
Install pimcore and initialize the DB docker-compose exec php-fpm vendor/bin/pimcore-install --mysql-host-socket=db --mysql-username=pimcore --mysql-password=pimcore --mysql-database=pimcore

When asked for admin user and password: Choose freely
This can take a while, up to 20 minutes
✔️ DONE - You can now visit your pimcore instance:

The frontend: http://localhost
The admin interface, using the credentials you have chosen above: http://localhost/admin
