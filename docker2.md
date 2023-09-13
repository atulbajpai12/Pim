>>>how to include complete infrastructure for magento 2 setup like add php 8.1, apache or nginx, elasticsearch etc ?

To include a complete infrastructure for a Magento 2 setup with PHP 8.1, a web server (Apache or Nginx), and Elasticsearch, you can modify the `docker-compose.yml` file to include these additional services. Here's how you can do it:

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
  webserver:
    image: nginx:latest  # or httpd:latest for Apache
    ports:
      - "8080:80"  # Adjust the ports as needed
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf  # For Nginx
      # or
      # - ./httpd.conf:/etc/httpd/conf/httpd.conf  # For Apache
    depends_on:
      - magento
```

Here are the changes and explanations for each service:

- **magento:** This is your Magento 2 service, which remains mostly unchanged from the previous example. It still depends on the `db` service for the database and links to the `elasticsearch` service for Elasticsearch.

- **db:** This is the MySQL service, as in the previous example.

- **elasticsearch:** This is the Elasticsearch service. It uses the official Elasticsearch image and exposes port 9200.

- **webserver:** This is the web server service. You can choose either Nginx or Apache. The `image` field specifies the web server image you want to use. Adjust the ports and volume mount points (`./nginx.conf` or `./httpd.conf`) according to your web server's configuration.

   - For Nginx, you should have an `nginx.conf` file in your project directory, which you can customize to configure Nginx for Magento.
   - For Apache, you should have an `httpd.conf` file in your project directory, which you can customize to configure Apache for Magento.

Make sure you have the necessary Nginx or Apache configuration files in your project directory or provide the paths to your custom configurations in the `volumes` section.

With this modified `docker-compose.yml` file, you'll have a complete infrastructure for a Magento 2 setup with PHP 8.1, a web server (Nginx or Apache), MySQL, and Elasticsearch. After saving the `docker-compose.yml` file, you can run `docker-compose up -d` to start the containers. Magento will be available at `http://localhost` (or `http://localhost:8080` if you chose Apache) in your web browser.