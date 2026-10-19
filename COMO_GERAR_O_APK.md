# 📱 Guia Passo a Passo: Gerando o APK do Rota+

Configuramos uma esteira profissional automatizada utilizando **Capacitor 6** e **GitHub Actions**. Com isso, você **não precisa baixar nem instalar os mais de 5 GB do Android Studio** no seu computador. A compilação do APK roda 100% na nuvem do GitHub e disponibiliza o arquivo `.apk` pronto para download.

---

## 🚀 Passo 1: Criar um Repositório no GitHub

1. Acesse [github.com/new](https://github.com/new) e faça login na sua conta do GitHub.
2. No campo **Repository name**, digite: `rotaplus-app` (ou o nome que preferir).
3. Deixe o repositório como **Público** ou **Privado**.
4. **Não marque** as opções de "Add a README file" nem ".gitignore" (pois já criamos tudo localmente).
5. Clique no botão verde **Create repository**.

---

## 📤 Passo 2: Conectar e Enviar o Código (Terminal)

Abra o terminal (PowerShell) nesta pasta (`c:\Users\Spinola\Documents\Projetos\Aplicativo para entregas`) e execute apenas estes 2 comandos (substituindo pelo link do seu repositório criado no GitHub):

```powershell
# 1. Vincule o seu repositório do GitHub:
git remote add origin https://github.com/wrmarcus12/rotaplus-app.git

# 2. Envie o código para o GitHub:
git push -u origin main
```

---

## ⚡ Passo 3: Compilação Automática do APK

Assim que você fizer o `git push`:

1. Vá até a aba **"Actions"** no topo do seu repositório no GitHub.
2. Você verá o workflow **"📱 Compilar APK do Rota+"** rodando automaticamente.
3. O GitHub irá:
   - Configurar o ambiente Android e Java 17 na nuvem.
   - Instalar o Capacitor e sincronizar a aplicação com o nome **Rota+**.
   - Configurar permissões de GPS e Geolocalização no `AndroidManifest.xml`.
   - Adicionar o ícone moderno do app.
   - Compilar o arquivo `RotaPlus-v1.0.apk`.
4. Em cerca de **2 a 3 minutos**, a execução ficará verde com status **Success**.

---

## 📲 Passo 4: Baixar e Instalar no Celular

1. Clique na execução concluída na aba **Actions**.
2. No final da página, na seção **Artifacts (Artefatos)**, você verá o item:
   👉 **`RotaPlus-v1.0-APK`** (com link para download direto do arquivo).
3. Baixe o arquivo `.zip` ou `.apk` no seu celular (ou transfira via WhatsApp/Google Drive/cabo).
4. No celular Android, toque no arquivo `.apk` para instalar:
   - Se o Android exibir o aviso *"Instalar de fontes desconhecidas"*, clique em **Permitir** (é o comportamento padrão para qualquer APK instalado fora da Google Play).
5. Pronto! O ícone do **Rota+** aparecerá na tela do seu celular com navegação GPS em tempo real, integração com Waze e tela cheia!

---

## 🌐 Bônus: Testar Imediatamente no Celular como PWA (Sem Compilar)

O aplicativo já está configurado como **Progressive Web App (PWA)**:
1. Se você hospedar a pasta `mvp` (no Vercel, Netlify, GitHub Pages ou servidor local na sua rede Wi-Fi), basta abrir o endereço no Google Chrome do celular.
2. Toque nos 3 pontinhos do Chrome e escolha **"Adicionar à tela de início"** ou **"Instalar aplicativo"**.
3. Ele criará o ícone nativo **Rota+** e abrirá em tela cheia idêntico ao app nativo.
