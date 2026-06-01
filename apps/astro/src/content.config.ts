import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const blog = defineCollection({
	loader: glob({
		base: "./src/content/blog",
		pattern: "**/*.{md,mdx}",
	}),
	schema: z.object({
		title: z.string(),
		description: z.string(),
		readingTime: z.string(),
		dateDisplay: z.string(),
		publishedISO: z.string(),
		author: z.object({
			name: z.string(),
			role: z.string(),
			avatar: z.string(),
		}),
		heroImage: z.string(),
		heroVideo: z.string().optional(),
		quote: z.string().optional(),
		draft: z.boolean().default(false),
		featured: z.boolean().default(false),
		tags: z.array(z.string()).default([]),
	}),
});

const helpErrors = defineCollection({
	loader: glob({
		base: "./src/content/help-errors",
		pattern: "**/*.{md,mdx}",
	}),
	schema: z.object({
		code: z.string(),
		title: z.string(),
		description: z.string(),
	}),
});

export const collections = { blog, helpErrors };
