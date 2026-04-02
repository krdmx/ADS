export type RoadmapTimelineEvent = {
  id: string;
  year: number;
  quarter: 1 | 2 | 3 | 4;
  title: string;
  description?: string;
  tier: "major" | "minor";
};

export const roadmapEvents: RoadmapTimelineEvent[] = [
  {
    id: "statistics-and-analytics",
    year: 2026,
    quarter: 2,
    title: "Statistics and analytics",
    description:
      "Pipeline trend views, stage-by-stage conversion snapshots, and stronger reporting clarity.",
    tier: "major",
  },
  {
    id: "interview-prep-recommendations",
    year: 2026,
    quarter: 2,
    title: "Interview prep recommendations",
    description:
      "Role-aware prep cues, likely focus areas, and tailored practice suggestions before each round.",
    tier: "major",
  },
  {
    id: "frequent-questions",
    year: 2026,
    quarter: 3,
    title: "Frequent questions",
    description:
      "A reusable bank of recruiter, hiring manager, and technical questions tied to each application.",
    tier: "minor",
  },
  {
    id: "release",
    year: 2026,
    quarter: 3,
    title: "Release",
    description:
      "The next public rollout wave for roadmap features, onboarding access, and product updates.",
    tier: "major",
  },
  {
    id: "placeholder-01",
    year: 2026,
    quarter: 4,
    title: "Placeholder milestone",
    description: "Replace this object with the next roadmap event.",
    tier: "minor",
  },
  {
    id: "placeholder-02",
    year: 2026,
    quarter: 4,
    title: "Placeholder milestone",
    description: "Replace this object with the next roadmap event.",
    tier: "minor",
  },
  {
    id: "placeholder-03",
    year: 2027,
    quarter: 1,
    title: "Placeholder milestone",
    description: "Replace this object with the next roadmap event.",
    tier: "major",
  },
  {
    id: "placeholder-04",
    year: 2027,
    quarter: 1,
    title: "Placeholder milestone",
    description: "Replace this object with the next roadmap event.",
    tier: "minor",
  },
];
