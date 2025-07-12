FROM node:18

# Install qpdf
RUN apt-get update && apt-get install -y qpdf

# Create app directory
WORKDIR /usr/src/app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy app source
COPY . .

EXPOSE 10000
CMD [ "node", "server.js" ]
