# Use a imagem oficial do Node.js
FROM node:18-alpine

# Define o diretório de trabalho
WORKDIR /app

# Instala o Angular CLI globalmente
RUN npm install -g @angular/cli

# Instala o Git
RUN apk add --no-cache git

# Copy ssh key to root folder
COPY ssh /root/.ssh
RUN chmod 600 /root/.ssh/id_ed25519 || true

# Git global config
RUN git config --global user.name "Alexandre Poltronieri Filho"
RUN git config --global user.email alexandrepoltronieri@gmail.com

# Expõe a porta padrão do Angular
EXPOSE 4200

# Mantém o container aberto para acesso manual
CMD ["tail", "-f", "/dev/null"]

