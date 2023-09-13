>>>Is above docker-compose included php 8.1 ?

I apologize for the oversight in the previous response. The provided `docker-compose.yml` example does not include PHP 8.1. To include PHP 8.1 in your Magento 2 Docker setup, you'll need to create a custom Dockerfile for PHP and reference it in your `docker-compose.yml`. Here's how you can modify your setup to include PHP 8.1:

1. **Create a Dockerfile for PHP 8.1:**

   Create a new file named `Dockerfile.php` in your project directory and add the following content:

   ```Dockerfile
   # Use the official PHP image as the base image
   FROM php:8.1-fpm
   
   # Install required PHP extensions for Magento
   RUN apt-get update && \
       apt-get install -y libfreetype6-dev libjpeg62-turbo-dev libpng-dev libwebp-dev libxpm-dev libzip-dev && \
       docker-php-ext-configure gd --with-freetype --with-jpeg --with-webp --with-xpm && \
       docker-php-ext-configure zip && \
       docker-php-ext-install -j$(nproc) gd pdo pdo_mysql zip opcache bcmath sockets

   # Set recommended PHP configuration
   RUN echo "date.timezone=UTC" > /usr/local/etc/php/conf.d/timezone.ini && \
       echo "memory_limit=2G" > /usr/local/etc/php/conf.d/memory_limit.ini && \
       echo "max_execution_time=1800" > /usr/local/etc/php/conf.d/max_execution_time.ini

   # Expose PHP-FPM on port 9000
   EXPOSE 9000

   CMD ["php-fpm"]
   ```

2. **Modify your `docker-compose.yml` file:**

   Update your `docker-compose.yml` to include the PHP service and reference the custom PHP Dockerfile. Additionally, make sure the `magento` service links to the `php` service.

   ```yaml
   version: '3'
   services:
     magento:
       image: magento:latest
       ports:
         - "80:80"
       environment:
         MYSQL_HOST: db
         MYSQL_USER: magento
         MYSQL_PASSWORD: magento
         MYSQL_DATABASE: magento
       depends_on:
         - db
       links:
         - elasticsearch:elasticsearch
         - php:php  # Link to PHP service
     db:
       image: mysql:5.7
       environment:
         MYSQL_ROOT_PASSWORD: root
         MYSQL_USER: magento
         MYSQL_PASSWORD: magento
         MYSQL_DATABASE: magento
     elasticsearch:
       image: docker.elastic.co/elasticsearch/elasticsearch:7.14.0
       ports:
         - "9200:9200"
       environment:
         - "discovery.type=single-node"
     php:
       build:
         context: .
         dockerfile: Dockerfile.php  # Reference the custom PHP Dockerfile
       ports:
         - "9000:9000"
   ```

3. **Build and Start the Containers:**

   Run the following command to build and start the Docker containers:

   ```
   docker-compose up -d
   ```

Now, your Docker setup includes PHP 8.1 along with the other services like Magento, MySQL, Elasticsearch, and a web server. Magento will be accessible at `http://localhost` in your web browser.