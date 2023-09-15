Creating a Docker-based development environment for Magento 2 with PHP 8.1, Nginx, MariaDB 10.x, and necessary PHP extensions involves several steps. Here's a complete set of sequential steps to set up this environment on a Windows 10 system:

**Prerequisites:**

1. **Windows 10 Pro, Enterprise, or Education Edition:** Ensure you have one of these editions as Docker for Windows requires them.

2. **Docker Desktop for Windows:** Download and install Docker Desktop for Windows from the Docker website (https://www.docker.com/products/docker-desktop).

3. **WSL 2 (Windows Subsystem for Linux 2):** Docker Desktop for Windows uses WSL 2 as the default backend. Enable WSL 2 by following the official Microsoft documentation: https://docs.microsoft.com/en-us/windows/wsl/install

**Step-by-Step Setup:**

1. **Clone Magento 2 Repository:**

   Clone the Magento 2 repository or download the Magento 2 source code to your local machine.

2. **Create a Docker Compose File:**

   In your Magento 2 project directory, create a `docker-compose.yml` file to define the services for your setup:

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
     db:
       image: mariadb:10.x
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
     webserver:
       image: nginx:latest
       ports:
         - "8080:80"
       volumes:
         - ./nginx.conf:/etc/nginx/nginx.conf
       depends_on:
         - magento
   ```

   Customize the configuration as needed. This `docker-compose.yml` includes Magento, MariaDB, Elasticsearch, and Nginx services.

3. **Create a Dockerfile for PHP 8.1:**

   Create a `Dockerfile.php` in your project directory to customize the PHP 8.1 image:

   ```Dockerfile
   # Use the official PHP 8.1 image as the base image
   FROM php:8.1-fpm

   # Install required PHP extensions
   RUN docker-php-ext-install pdo pdo_mysql opcache bcmath sockets

   # Set recommended PHP configuration
   RUN echo "date.timezone=UTC" > /usr/local/etc/php/conf.d/timezone.ini && \
       echo "memory_limit=2G" > /usr/local/etc/php/conf.d/memory_limit.ini && \
       echo "max_execution_time=1800" > /usr/local/etc/php/conf.d/max_execution_time.ini

   # Expose PHP-FPM on port 9000
   EXPOSE 9000

   CMD ["php-fpm"]
   ```

   4. **Create an Nginx Configuration (nginx.conf):**

   Create an `nginx.conf` file in your project directory to customize the Nginx configuration for Magento:

   ```nginx
   # Replace this with your actual server_name
   server {
       listen 80;
       server_name localhost;
       root /var/www/html/pub;

       location / {
           try_files $uri $uri/ /index.php$is_args$args;
       }

       location ~ ^/(app|bin|dev|setup)/ {
           deny all;
       }

       location ~ ^/(composer.json|composer.lock|composer.phar|README.md|CONTRIBUTING.md|LICENSE.txt) {
           deny all;
       }

       location ~ \.php$ {
           fastcgi_pass magento:9000;
           fastcgi_index index.php;
           fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
           include fastcgi_params;
       }

       location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot|otf)$ {
           expires max;
           log_not_found off;
           add_header Cache-Control "public, immutable";
       }
   }
   ```

   5. **Build the PHP 8.1 Docker Image:**

   Build the PHP 8.1 Docker image using the `Dockerfile.php`:

   ```bash
   docker build -t php-magento:8.1 -f Dockerfile.php .
   ```

   6. **Start Docker Containers:**

   Start the Docker containers defined in the `docker-compose.yml`:

   ```bash
   docker-compose up -d
   ```

   This command will download necessary images and start the containers in detached mode (`-d` flag).

   7. **Access Magento Setup:**

   Once the containers are running, access the Magento setup by opening a web browser and navigating to `http://localhost`. Follow the Magento installation steps.

   8. **Access Magento Admin:**

   After installation, access the Magento Admin panel by going to `http://localhost/admin`.

   That's it! You now have a Docker-based development environment for Magento 2 with PHP 8.1, Nginx, MariaDB 10.x, and Elasticsearch on your Windows 10 system. You can further customize your setup and add Magento 2 extensions and configurations as needed for your project.