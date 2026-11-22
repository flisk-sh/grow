// The example plan on /example: a real plan grow made for its own repo, kept as a file so it costs no model call.
// Replace it with a better one by copying /api/plan/<id> here.
export const EXAMPLE = {
 "url": "https://github.com/flisk-sh/grow/tree/main",
 "site": "https://grow.flisk.si/",
 "product": "A tool that generates a plan to find the first customers for a product, by pasting a link to the product on its website.",
 "queries": [
  "find first customers",
  "product acquisition strategy",
  "customer growth plan"
 ],
 "buyers": "Product managers at small startups who are struggling to find their first customers and need a simple, free tool to help them create a customer acquisition strategy.",
 "pitch": "Get a personalized plan to find your first customers with just a link to your product.",
 "today": "Send the first two emails below to solo developers who launched a repo this month, then post on X.",
 "places": [
  {
   "name": "GitHub blog",
   "why": "to reach product managers at small startups",
   "url": "https://github.blog/"
  },
  {
   "name": "Reddit - r/startups",
   "why": "a community of startup founders and product managers",
   "url": "https://www.reddit.com/r/startups/"
  },
  {
   "name": "Reddit - r/productmanagement",
   "why": "a community of product managers",
   "url": "https://www.reddit.com/r/productmanagement/"
  },
  {
   "name": "Startup Nation",
   "why": "a community of startup founders and entrepreneurs",
   "url": "https://www.startupnation.com/"
  },
  {
   "name": "Product Hunt",
   "why": "a platform for new product launches",
   "url": "https://www.producthunt.com/"
  },
  {
   "name": "Stack Overflow",
   "why": "a Q&A platform for developers and product managers",
   "url": "https://stackoverflow.com/"
  },
  {
   "name": "No-Code Tools subreddit",
   "why": "a community of no-code tool users and creators",
   "url": "https://www.reddit.com/r/nocode/"
  },
  {
   "name": "No-Code subreddit",
   "why": "a community of no-code tool users and creators",
   "url": "https://www.reddit.com/r/nocode/"
  }
 ],
 "emails": [
  {
   "to": "solo developers who just put a project on GitHub and have under 50 stars",
   "find": "people who posted Show HN this week on Hacker News",
   "subject": "Get first customers for your GitHub project",
   "body": "I saw your project on GitHub and noticed it has only 26 stars. I made a tool that helps creators like you find their first customers. It's free and no sign-in required. You can paste a link to your project and get a plan to start. Would you like to try it out?",
   "followup": "Hi, I sent you an email about Grow a week ago. Did you have a chance to check it out and see if it can help you find your first customers?"
  },
  {
   "to": "product managers at small startups",
   "find": "people asking how to get first users on r/SideProject",
   "subject": "Find your first customers with Grow",
   "body": "I saw your post on Reddit about getting your first users. I made a tool that helps product managers like you find their first customers. It's called Grow and you can paste a link to your product and get a plan to start. Would you like to try it out?",
   "followup": "Hi, I sent you an email about Grow a week ago. Did you have a chance to check it out and see if it can help you find your first customers?"
  },
  {
   "to": "entrepreneurs who just launched a product on Product Hunt",
   "find": "people who posted on Product Hunt this week",
   "subject": "Get more visibility for your Product Hunt launch",
   "body": "I saw your product on Product Hunt and noticed it's getting a lot of attention. I made a tool that helps creators like you find their first customers. It's called Grow and you can paste a link to your product and get a plan to start. Would you like to try it out?",
   "followup": "Hi, I sent you an email about Grow a week ago. Did you have a chance to check it out and see if it can help you get more visibility for your Product Hunt launch?"
  },
  {
   "to": "small business owners who are struggling to find customers",
   "find": "people asking for advice on Quora about finding customers",
   "subject": "Find your first customers with Grow",
   "body": "I saw your question on Quora about finding customers. I made a tool that helps small business owners like you find their first customers. It's called Grow and you can paste a link to your business and get a plan to start. Would you like to try it out?",
   "followup": "Hi, I sent you an email about Grow a week ago. Did you have a chance to check it out and see if it can help you find your first customers?"
  },
  {
   "to": "independent creators who are struggling to monetize their work",
   "find": "people asking for advice on Reddit about monetizing their work",
   "subject": "Monetize your work with Grow",
   "body": "I saw your post on Reddit about monetizing your work. I made a tool that helps independent creators like you find their first customers. It's called Grow and you can paste a link to your work and get a plan to start. Would you like to try it out?",
   "followup": "Hi, I sent you an email about Grow a week ago. Did you have a chance to check it out and see if it can help you monetize your work?"
  }
 ],
 "posts": [
  {
   "where": "X",
   "title": "Finding the first customers for my product",
   "body": "I built Grow, a tool that generates a plan to find the first customers for a product. I'm looking for people who want to try it out and give me feedback."
  },
  {
   "where": "Reddit",
   "title": "Get feedback on my product",
   "body": "I created Grow, a free online tool that helps makers like me find their first customers. I'd love to get feedback from users who try it out."
  },
  {
   "where": "Hacker News",
   "title": "Grow: A tool to find the first customers for your product",
   "body": "I built Grow, a simple web app that takes a link to your product and generates a plan to find its first customers. I'm looking for users to try it out and provide feedback."
  },
  {
   "where": "Discord",
   "title": "Show your work: Grow",
   "body": "Hey everyone, I just built a tool called Grow that helps makers find their first customers. I'd love to get feedback from you all. Paste a link to your project and see what Grow comes up with."
  }
 ],
 "check": {
  "score": 5,
  "grade": "F",
  "fixes": [
   {
    "title": "AI answer engines can crawl the page",
    "summary": "robots.txt answered 522. Crawlers treat an unreadable robots.txt as \"keep out\" until they can read it.",
    "status": "fail"
   },
   {
    "title": "The page can be indexed and quoted",
    "summary": "The page answered 522. Crawlers keep only pages that answer 200.",
    "status": "fail"
   },
   {
    "title": "Sitemap",
    "summary": "No sitemap at /sitemap.xml and none listed in robots.txt.",
    "status": "warn"
   }
  ],
  "report": "https://citable.flisk.si/grow.flisk.si"
 },
 "listings": [
  {
   "name": "Product Hunt",
   "why": "A launch day with a page people can upvote and comment on.",
   "url": "https://www.producthunt.com/posts/new"
  },
  {
   "name": "SaaSHub",
   "why": "A software directory people search for alternatives.",
   "url": "https://www.saashub.com/submit"
  },
  {
   "name": "AlternativeTo",
   "why": "Shows up when people look for an alternative to a known app.",
   "url": "https://alternativeto.net/manage-item/"
  },
  {
   "name": "BetaList",
   "why": "Early adopters who sign up for new products.",
   "url": "https://betalist.com/submit"
  },
  {
   "name": "Toolradar",
   "why": "A tool directory that AI assistants read.",
   "url": "https://toolradar.com/submit"
  },
  {
   "name": "Uneed",
   "why": "A daily launch list for new tools.",
   "url": "https://www.uneed.best/submit-a-tool"
  },
  {
   "name": "DevHunt",
   "why": "A launch list for developer tools.",
   "url": "https://devhunt.org/"
  },
  {
   "name": "AIChief",
   "why": "An AI tools directory with a page per tool.",
   "url": "https://aichief.com/submit-tool/"
  },
  {
   "name": "FoundrList",
   "why": "A launch list for founders, with a badge you can put on your site.",
   "url": "https://www.foundrlist.com/"
  },
  {
   "name": "LaunchAmp",
   "why": "A European launch directory that approves each tool and gives a badge.",
   "url": "https://launchamp.eu/"
  },
  {
   "name": "ToolPotion",
   "why": "An AI tools directory with ranked pages per tool.",
   "url": "https://toolpotion.ai/"
  },
  {
   "name": "SourceForge",
   "why": "Mirrors your releases and lists the project for people browsing open source.",
   "url": "https://sourceforge.net/create/"
  }
 ],
 "promo": [
  {
   "name": "Flisk Discord #show-your-stack",
   "where": "Discord",
   "rule": "Show what you built with or next to Flisk. Post the link and what it does.",
   "url": "https://discord.com/channels/1562937840071999538/1569404291196915904"
  },
  {
   "name": "r/SideProject",
   "where": "Reddit",
   "rule": "Made for people who share their own projects; say what it does and ask for feedback.",
   "url": "https://www.reddit.com/r/SideProject/submit"
  },
  {
   "name": "r/alphaandbetausers",
   "where": "Reddit",
   "rule": "Made for finding early testers; say what you need tested.",
   "url": "https://www.reddit.com/r/alphaandbetausers/submit"
  },
  {
   "name": "r/SaaS",
   "where": "Reddit",
   "rule": "Share a product with the story behind it; read the pinned rules first.",
   "url": "https://www.reddit.com/r/SaaS/submit"
  },
  {
   "name": "r/webdev (Showoff Saturday)",
   "where": "Reddit",
   "rule": "Self-promotion only in the Saturday thread; do not post it on other days.",
   "url": "https://www.reddit.com/r/webdev/"
  },
  {
   "name": "r/InternetIsBeautiful",
   "where": "Reddit",
   "rule": "Only for a free, public site that is nice to look at or use; no sign-up wall.",
   "url": "https://www.reddit.com/r/InternetIsBeautiful/submit"
  },
  {
   "name": "Find Discord servers for your buyers (Disboard)",
   "where": "Discord",
   "rule": "Search your buyers' topic, join 3 servers, and look for a channel named show-your-work, showcase, self-promo or promote. Read its pinned rule before you post.",
   "url": "https://disboard.org/"
  }
 ],
 "tools": [
  {
   "name": "Citable",
   "why": "Can ChatGPT, Claude and Perplexity read and quote your page.",
   "url": "https://citable.flisk.si"
  },
  {
   "name": "README Score",
   "why": "A score for a GitHub README and a fix for each missing part.",
   "url": "https://readme.flisk.si"
  },
  {
   "name": "Flisk Analytics",
   "why": "Count visitors without cookies. Invite only for now.",
   "url": "https://analytics.flisk.si"
  }
 ],
 "ranker": {
  "repo": "flisk-sh/grow",
  "url": "https://ranker.flisk.si/flisk-sh/grow",
  "listed": true,
  "badge": "https://ranker.flisk.si/badge/flisk-sh-grow.svg",
  "stars": 0,
  "markdown": "[![Flisk Ranker](https://ranker.flisk.si/badge/flisk-sh-grow.svg)](https://ranker.flisk.si/flisk-sh/grow)"
 }
};
