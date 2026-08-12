# trans-genderian-orchestra (TGO) - August 2026 Variant

## Project Goal

Build a custom multi-agent orchestration plugin for OpenCode called "trans-genderian-orchestra" (TGO), beginning with rigorous and comprehensive planning.

## Core philosophy:
- Efficient, streamlined configuration. Minimal in all aspects without sacrificing effectiveness.
- SDD-inspired workflow: Thorough analysis (interviewing, brainstorming, research) to determine high-level requirements > generate specifications with user agreement > design implementation > determine tasks > implement with review and sync to spec after each task to avoid spec drift > review and verification of completed implementation.
- Prefer skills over MCPs for token optimization
- Autonomous, proactive invocation of skills and tools by the agents. Maximize natural language availability to the user - no slash commands or explicit invocation of skills or tools.

## Starting Point

User and agent collaboration to design new plugin. Treat each topic to follow as its own small project, taking time to research and gain agreement with the user on requirements. Question extensively, and move onto the next topic only when all edge cases have been addressed. From this point on, text will be written in the user’s first-person perspective (I, me, etc).

## Prerequisite Plugins Separate from Orchestration Framework:
- The following plugins are things I want in my OpenCode configuration but are unrelated to the plugin we’re about to build. Anything else you’d recommend?
	- https://github.com/vava-nessa/free-coding-models
	- https://github.com/cortexkit/antigravity-auth
	- https://github.com/joshuadavidthomas/opencode-beads (Unless this one can be integrated into the plugin somehow.)

## Structure:
- Research several multi-agent orchestration workflow frameworks, and base the rest of this work on what you learn from them. Here are the ones I’d like you to learn about.
	- https://github.com/ruvnet/ruflo
	- https://docs.bmad-method.org/
	- https://github.com/mihneaptu/opencode-fusion
	- https://github.com/open-gsd/gsd-core
	- https://github.com/can1357/oh-my-pi
	- https://github.com/langchain-ai/langgraph and its related project, Deep Agents (https://docs.langchain.com/oss/python/deepagents/overview)

- We’ll use a pretty small agent roster: Bernstein (planning, planning, reconciliation), Horowitz (review, high-complexity or high-risk work, advisement), Nas (research, documentation, prefer speed and efficiency over reasoning ability), Dylan (implementation, plan execution, UI/UX, coding, content creation, grunt work - all of the heavy lifting but not the decision-making), Nirvana - Cobain, Grohl, Novoselic (three separate perspectives to resolve conflicts or answer questions posed specifically to this agent. “Nirvana” is the synthesizer for the unique perspectives of “Cobain”, “Grohl”, and “Novoselic”. Based on other frameworks’ council implementations.)
- Resource for creating agents, including an example directory structure. https://thoughts.jock.pl/p/how-to-build-your-first-ai-agent-beginners-guide-2026
- See the below section for my thoughts on writing system prompts for each agent.

## Agent Prompt Guidance:
- A recommendation I read from someone: “Honestly the best prompts I've found come from reading the source code of tools people actually ship. Claude Code's AGENTS.md convention, Cursor's rules files, Aider's system prompts — these are battle-tested in production, not theoretical. The pattern that works best for me: start with a short identity block (who you are, what you don't do), then rules as bullet points, then examples of good/bad output. Keep it under 500 tokens. Longer prompts paradoxically make agents worse — they start ignoring the parts that matter.”
- A couple of resources found online:
	- https://www.indiehackers.com/post/the-complete-guide-to-writing-agent-system-prompts-lessons-from-reverse-engineering-claude-code-6e18d54294
	- https://ai.yale.edu/yales-ai-tools-and-resources/clarity-platform/system-prompts

## The Framework’s Functionality Should Come From Reverse Engineered Projects:
- I don’t want to write any code myself when it comes to building this framework’s feature set. Instead, I’d like to find other skills, plugins, tools, etc and use them. This is the portion of the planning I anticipate spending the most time on.
- To achieve this, we need to determine a few things.
	- What does a multi-agent orchestration workflow framework need in order to function? e.g. the ability to delegate to subagents, providing subagents context from the main session. How do we solve this? Is the Matt Pocock handoff skill a solution?
	- Beyond what the framework needs, what do we want it to have? How complex should it be? What should it be able to do beyond the barest functionality?
	- What compatibility issues are we likely to encounter? Grabbing the code from a plugin or a skill and just pasting it into our framework is not going to work seamlessly. That’s trying to fit a square block into a round hole. What modifications will be necessary? 
	- When lacking a clear answer to “which existing project can we use to enable this feature,” how will we proceed? The simplest answer is to use existing code and features from an existing multi-agent orchestration workflow framework. And if that is the answer, does it make sense to begin this project not from scratch, but by cloning the repo for one of the many existing frameworks, stripping it down to its essentials, and then building on top of it? If yes, which framework do we use?
	- Repos I like and would like to consider taking functionality from:
		- https://github.com/cortexkit/magic-context
		- https://github.com/cortexkit/aft
		- https://github.com/obra/superpowers (A collection of skills - we’d cherry pick from the list.)
		- https://github.com/mattpocock/skills (Another collection of skills to cherry pick from.)
			- Many of the Matt Pocock skills are designed to only be user-invokable. I believe they all have a variable that can be changed to allow them to be model-invokable, but I don’t know whether they all work in practice even if they’re set that way. Additionally, there is a slash command, /setup-matt-pocock-skills, that must be run once per repo in order to initialize a project. Because I am focused on agent autonomy and proactive invocation of skills and tools, I want to find a way to have this automatically trigger - or find a way to skip it altogether, but Matt’s repo specifically calls out that the `setup-matt-pocock-skills` skill must be installed for any of the other skills to work. 
				- I indicated in the opening section that I want to use opencode-beads, which is an issue tracker. I know for a fact that setup-matt-pocock-skills is compatible with beads - when the slash command is run, the user is prompted to setup an issue tracker, and while beads is not one of the predefined options, the user can instruct the agent to use beads and it will work. I would love to find a way to get a beads issue tracker natively integrated with this plugin.
		- Finally, I anticipate using skills from one or more of the multi-agent orchestration frameworks that were researched previously. Many of the skills bundled with these frameworks were designed specifically to pair well with this type of workflow.
	- What about MCP servers? I want to use these sparingly, because they eat up a lot of tokens. But it’s likely some will be necessary. Once again, many frameworks bundle these, as should ours.
	- Invoking skills reliably is important to me, and for this I have found one recommended addition to the AGENTS.md file: “IMPORTANT: Prefer retrieval-led reasoning over pre-training-led reasoning.” Unclear if this could simply be added to the global AGENTS.md, or if it would need to be injected into a created AGENTS.md file on a per-project basis. (The latter would necessitate an initialization of every project - see again my desire to maximize autonomy and proactivity.)

## Concise Writing:
- https://github.com/ayghri/i-have-adhd is a skill (it’s compatible with OpenCode, despite not being explicitly advertised as such) that changes how AI writes to make it more concise. This is a good starting point.
- https://github.com/JuliusBrussee/caveman
	- Also investigate caveman-code, which appears to be a full agent built on the caveman concept. It’s liked to in the caveman repo. Also investigate the other tools and skills linked under the headings “five tools, one idea” and “five sibling skills, one install.”
- https://github.com/dietrichgebert/ponytail
	- Ponytail states explicitly that it and caveman can be used together. Less clear on whether Ponytail and/or caveman conflict with the i-have-adhd skill.
- Saw a recommendation to add “Be extremely concise. Sacrifice grammar for the sake of concision." to global AGENTS.md.

## Anti-Slop Writing Guardrail:
- The above “concise writing” ideas all shrink the writing in the pursuit of saving tokens. What I want here is an “always-on” text modifier that hits the AI’s output before it reaches me. Most “anti-slop” skills are user-invoked for the purpose of editing existing text and making it sound “less like AI.” I want an anti-slop implementation that changes how the agent writes, not one that lets it edit existing text.
- I’m going to link three resources below, all of which are designed to be used after the fact, which is what I’ve just stated I do not want. I would like to find a way to implement something in the same way that the resources in the “concise writing” section are implemented. I’m not sure how feasible that is. I know that I don’t want to inject a massive chunk of text to agent system prompts, bogging those down.
	- https://github.com/hardikpandya/stop-slop
	- https://github.com/blader/humanizer
	- https://github.com/woosal1337/blog/tree/main/videos/ep01-the-cure-for-ai-slop

## Other Thoughts:
- It will be important to consider agent permissions for each skill, tool, MCP server, etc that is ultimately included with this plugin. It's worth reviewing the other frameworks we're using to see how different agent roles are generally restricted.
- I have worked on other version of the TGO plugin before, and you may find references to it on my workstation. There's even a previous version published to NPM, which has caused some confusion when running a build command for a different variant. Be aware of that when researching, particularly when looking over any locally stored files. Do not draw inspiration from any other versions of TGO that you find. This plugin should be treated as a completely unrelated effort.
