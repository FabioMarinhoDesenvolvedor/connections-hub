// Add only real projects with company approval and owned/authorised screenshots.
// Empty by design: supplied assets document the brand, not delivered client projects.
export type Project = {
  slug: string;
  title: string;
  category: string;
  summary: string;
  image: { src: string; alt: string; width: number; height: number };
  delivered: string[];
  outcome?: string;
  href?: string;
  approved: true;
};
export const projects: Project[] = [];
