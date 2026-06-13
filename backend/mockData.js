/**
 * Mock user profile data
 * In Phase 3, this will be replaced with GitHub API integration
 */
const mockUserProfile = {
  personalInfo: {
    name: "Saad Haider",
    email: "saad.haider@example.com",
    phone: "+1 (555) 123-4567",
    location: "Remote",
    linkedin: "https://www.linkedin.com/in/saad-haider-455123258/",
    github: "https://github.com/SaadHaider01"
  },
  summary: "Full-stack software engineer with 5+ years of experience building scalable web applications using modern JavaScript frameworks and cloud technologies.",
  skills: {
    languages: ["JavaScript", "Python", "TypeScript", "Java", "SQL"],
    frameworks: ["React", "Node.js", "Express.js", "Next.js", "Django"],
    tools: ["Git", "Docker", "AWS", "MongoDB", "PostgreSQL", "Redis"],
    methodologies: ["Agile", "CI/CD", "Test-Driven Development", "RESTful APIs"]
  },
  experience: [
    {
      company: "TechCorp Inc.",
      position: "Senior Software Engineer",
      duration: "Jan 2021 - Present",
      location: "San Francisco, CA",
      achievements: [
        "Led development of microservices architecture serving 1M+ users, improving system scalability by 300%",
        "Implemented CI/CD pipeline using GitHub Actions, reducing deployment time by 60%",
        "Mentored 5 junior developers and conducted code reviews to maintain code quality standards",
        "Architected real-time notification system using WebSockets and Redis, handling 10k concurrent connections"
      ]
    },
    {
      company: "StartupXYZ",
      position: "Full-Stack Developer",
      duration: "Jun 2019 - Dec 2020",
      location: "Remote",
      achievements: [
        "Built responsive e-commerce platform using React and Node.js, generating $2M in annual revenue",
        "Optimized database queries reducing API response time by 45%",
        "Integrated third-party payment gateways (Stripe, PayPal) with 99.9% uptime",
        "Developed RESTful APIs consumed by web and mobile applications"
      ]
    },
    {
      company: "DevSolutions LLC",
      position: "Junior Developer",
      duration: "Aug 2018 - May 2019",
      location: "Austin, TX",
      achievements: [
        "Developed customer-facing dashboards using React and Chart.js",
        "Collaborated with design team to implement pixel-perfect UI components",
        "Fixed 100+ bugs and implemented feature requests using Agile methodology",
        "Wrote unit tests achieving 85% code coverage"
      ]
    }
  ],
  education: [
    {
      degree: "Bachelor of Science in Computer Science",
      institution: "University of California, Berkeley",
      graduation: "2018",
      gpa: "3.8/4.0"
    }
  ],
  projects: [
    {
      name: "TaskMaster Pro",
      description: "Project management tool with real-time collaboration features",
      technologies: ["React", "Node.js", "Socket.io", "MongoDB"],
      highlights: [
        "Built drag-and-drop Kanban board with real-time updates",
        "Implemented user authentication with JWT and OAuth2",
        "Deployed on AWS with auto-scaling capabilities"
      ]
    },
    {
      name: "WeatherNow",
      description: "Weather forecasting app with location-based alerts",
      technologies: ["React Native", "Express.js", "OpenWeather API"],
      highlights: [
        "Integrated geolocation services for automatic location detection",
        "Implemented push notifications for severe weather alerts",
        "Published on iOS and Android app stores with 4.5+ rating"
      ]
    },
    {
      name: "ResumeX",
      description: "A Chrome extension that automates form autofilling and LinkedIn scraping with a backend PDF generation service.",
      technologies: ["JavaScript", "HTML", "CSS", "Express", "pdfkit"],
      highlights: [
        "Implemented automated resume formatting logic, improving generation speed by 30%.",
        "Integrated GitHub API to fetch user profile data for seamless auto-fill."
      ]
    },
    {
      name: "J.A.R.V.I.S",
      description: "An advanced, locally-hosted AI personal assistant with real-time offline wake-word detection, Whisper speech-to-text, and Edge-TTS.",
      technologies: ["Python", "Whisper", "Edge-TTS", "AI"],
      highlights: [
        "Designed modular pipeline enabling 95% accurate wake-word detection without internet.",
        "Leveraged Whisper and Edge-TTS to achieve sub-second response times."
      ]
    },
    {
      name: "LInguaVoice",
      description: "A multilingual voice-to-voice translation application using JavaScript and Web Speech API.",
      technologies: ["JavaScript", "Web Speech API", "TypeScript"],
      highlights: [
        "Supported 12 languages with real-time translation latency under 300ms.",
        "User engagement increased by 35% after feature rollout."
      ]
    }
  ],
  certifications: [
    "AWS Certified Solutions Architect - Associate",
    "GitHub Actions Certified"
  ]
};

module.exports = mockUserProfile;
