![GitHub PR Buddy](https://github-pr-buddy.vercel.app/og-image.png)

# GitHub PR Buddy

GitHub PR Buddy is an open source dashboard for monitoring GitHub pull requests and creating custom dashboards. Easily deployable on your own server, it gives you actionable insights into your repository's PRs—making code review and project management more efficient.

> **Public Repository**  
> Download, modify, and run GitHub PR Buddy on your own server. Follow the production or local development instructions below to get started.

---

## Features

- **Real-Time Monitoring:** Keep track of pull requests and their statuses in real time.
- **Custom Dashboards:** Create personalized dashboards to visualize PR metrics.
- **Easy Deployment:** Run GitHub PR Buddy on your own server using simple production commands.
- **Fully Open Source:** Modify, extend, and contribute to the project as needed.

---

## Technologies Used

- [Next.js 14](https://nextjs.org/docs/getting-started)
- [HeroUI](https://heroui.com)
- [Tailwind CSS](https://tailwindcss.com)
- [Tailwind Variants](https://tailwind-variants.org)
- [TypeScript](https://www.typescriptlang.org)
- [Framer Motion](https://www.framer.com/motion)
- [next-themes](https://github.com/pacocoursey/next-themes)

---

## Getting Started

### Production Deployment

For a production environment, we recommend using **yarn** and **pm2**. Follow these steps:

1. **Install dependencies:**

   ```bash
   yarn install
   ```

2. **Build the project:**

   ```bash
   yarn build
   ```

3. **Run the service with pm2:**

   ```bash
   pm2 start yarn --name "github-pr-buddy" -- run start
   ```

   This command starts your application in production mode using pm2 as the process manager.

---

### Local Development

For local development, simply modify the code and follow Next.js guidelines:

1. **Install dependencies:**

   You can use your preferred package manager; for example, using npm:

   ```bash
   npm install
   ```

   Or with yarn:

   ```bash
   yarn install
   ```

2. **Run the development server:**

   ```bash
   npm run dev
   ```

   Or, using yarn:

   ```bash
   yarn dev
   ```

3. Open [http://localhost:3000](http://localhost:3000) with your browser to see the application.

---

## Contributing

Contributions, issues, and feature requests are welcome!  
Feel free to check the [issues page](https://github.com/thomsa/github-pr-buddy/issues) if you want to contribute.

---

## License

This project is licensed under the [MIT License](https://github.com/thomsa/github-pr-buddy/blob/main/LICENSE).

---

## Acknowledgments

- A huge thanks to the teams behind Next.js, HeroUI, and the entire open source community.
