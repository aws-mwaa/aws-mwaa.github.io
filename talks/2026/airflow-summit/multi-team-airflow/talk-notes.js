/*
 * Speaker notes for the Multi-Team Airflow talk.
 * Edit freely: plain text, real newlines become line breaks in the speaker view.
 * "slide" = note shown at the start of the slide; "steps" = note per animation step,
 * matched to elements in talk.html via their data-note-key attribute.
 */
const TALK_NOTES = {

	/* ================== title ================== */
	"title": {
		slide: `
Hello, I'm Niko Oliveira.
<br>I'm an Apache Airflow Committer and PMC member and have been contributing to Airflow for over 5 years now.
<br>I've also worked at Amazon for 9 years. I helped build and launch the MWAA service.
<br>Shortly after that I segued into starting an OSS team within Amazon to develop OSS Airflow.
<br>(Vincent intro)
<br>
<br>Today we're going to talk about multi-team Airflow, starting off with a bit of motivation and background.
`,
	},

	/* ================== problem ================== */
	"problem": {
		slide: `
Here is the problem we're trying to solve.

Airflow usually starts as a tool one team stands up and runs for itself.
But it catches on: another team wants one, then a few more, and before long everyone working with data wants a piece of it.

So the question becomes: how do you give every team its own Airflow, without running an Airflow for every team?

They want the shared platform, the shared operational knowledge, and the shared cost.
What they don't want is to step on each other's toes.
`,
	},

	/* ================== two-ways ================== */
	"two-ways": {
		slide: `
Historically there have been two major ways out of this problem, and each one answers only half of the question.
`,
		steps: {
			"own-env": `
Option 1: everyone gets their own Airflow environment.
`,
			"own-env-pros": `
Pros:
- full isolation
- easy to update/upgrade individual environments independently
`,
			"own-env-cons": `
Cons:
- expensive (many databases)
- lots of time spent managing individual envs
- it gets complicated unless you're very diligent in tracking or automation.
`,
			"monolith": `
Option 2: one monolithic Airflow.
`,
			"monolith-pros": `
Pros:
- easy upgrade path
- easy to manage
- you might save some money on databases and compute
`,
			"monolith-cons": `
Cons:
- no isolation (noisy neighbour, no isolation in dag running or viewing, etc).
`,
		},
	},

	/* ================== working-backwards ================== */
	"working-backwards": {
		slide: `
So what do we do?
<br>Amazon has this ethos called "working backwards"
<br>You listen and observe exactly what people are asking for or having to build around.
<br>Don't build something because just you think it's cool or interesting.
`,
		steps: {
			"talks": `
I went through Airflow Summit talks from previous years (they're all online, references in the speaker notes) and observed what people were building.
At least 8 organizations spoke about their own workarounds or platforms built on Airflow to help solve multi team problems:

- Wealthsimple: built a multi-tenant platform on a single instance of Airflow (2023).
- GoDaddy: moved to a cloud hosted single-pane architecture (2024).
- Expedia: built a multi-tenant platform on top of Airflow focused on CI/CD, separating DAG development, and variables (2025).
There are more but I will stop here.
Organizations keep solving this themselves, an indicator that there is something to be done in Airflow itself.

- Balyasny Asset Management: leveraged Kubernetes to support over 100 teams, bundling shared pieces like logging, metrics, alerting, auth, secrets, dashboards (2024).
- Rakuten Kobo: built self-service permission management around DAG access/authorship, and guardrails against noisy neighbours (2024).
- Coinbase: highly optimized CI/CD for orchestration to support many teams (2024).
- Ford: built the Mach1ML platform which uses Airflow as the orchestration layer, another single-pane solution (2024).
- Duolingo: built DuoFactory, a specialized orchestration ecosystem that leverages Airflow primitives (2025).
`,
			"survey": `
What about individual users? The annual Airflow survey asks this question.
For the last 4 years we've seen a consistent 30% or more of respondents want Multi Tenancy as a new feature.
Usually in the top 3 of new feature requests.
So if we're working backwards and listening to our users, we should build this thing, right?
`,
		},
	},

	/* ================== aip67 ================== */
	"aip67": {
		slide: `
It took a while to build consensus within the Airflow community on HOW.
But after multiple iterations over a year and a half we finally settled on AIP-67.
`,
		steps: {
			"is-not": `
From what we saw users building and asking for, they don't necessarily need NSA-level isolation between their internal teams.
`,
			"is": `
They just need enough of a perimeter to not step on each other's toes
can't read each other's secrets, or run/modify each other's dags, etc.
`,
			"summary": `
Summary: share the control plane, isolate the data/execution plane.
`,
		},
	},

	/* ================== tenets ================== */
	"tenets": {
		slide: `
The core tenets we designed around.
`,
		steps: {
			"shared-infra": `
Shared Infrastructure - keep costs down and management simple.
`,
			"exec-isolation": `
Execution Isolation - entirely separate execution paths per team (if desired, more on that later).
`,
			"security": `
Security - team specific Connections, Variables, Secrets, etc.
`,
			"ui-focus": `
UI Focus - teams only see their Dags, Tasks, Connections, etc.
`,
			"flexibility": `
Flexibility - mix and match the above, team vs global namespace as needed.
`,
		},
	},

	/* ================== arch ================== */
	"arch": {
		slide: `
Now let's dive a little deeper!
It looks like a lot but we'll walk through it piece by piece.

Shared global components on the left in blue, team components on the right in green (stacked cards indicate multiple teams).

The boxes are logical groupings of processes/data, not necessarily the same server.
`,
		steps: {
			"executors": `
1. Executors: one or more executors per team
a team executor only runs its own team's tasks.
Teams that don't specify an executor fall back to the global executors (the same executors all dags shared in Airflow 2).
`,
			"execconfig": `
2. Executor config:
set by the org admin, provided by teams
same executor config field you know and love
core.executor and the related configurations for each executor (env or config)
`,
			"workers": `
3. Workers:
executors route tasks to the right team's compute
the Task API limits variable/secret/connection access to own team or global
`,
			"dagproc": `
4. Dag processing happens per team
bundles have a team attribute
this is THE mechanism that assigns dags to teams
`,
			"triggerer": `
5. Triggerer:
triggerer now takes a team_name arg, to indicate which team to draw tasks from
a global triggerer covers teamless triggers
`,
			"teamconfig": `
6. Team config:
Teams specify airflow config, dependencies, etc for all components running in their team managed compute
teams can differ wildly or org/team admins can keep them in sync to any degree as needed.
This is very dev ops dependent
`,
			"orgadmin": `
7. The Org admin manages shared components.
Teams should not have access to configurea or install anything on shared compute unless trusted.
This is up to your internal auth and dev ops practices to enforce.
`,
			"teamadmin": `
8. The Team admin controls team compute config and packages.
This may also be the org admin depending on your setup
`,
			"ui": `
9. UI: the web API asks the Auth Manager to filter per team.
Keycloak auth manager is available (Simple auth manager for dev).
See Vincent's Keycloak deep-dive talk!
`,
		},
	},

	/* ================== metrics ================== */
	"metrics": {
		slide: `
Team-based metrics shipped in 3.3.

When multi-team is on, Airflow adds a team_name tag to various operational metrics for team-owned resources.
`,
		steps: {
			"ti-finish": `
Example: a task-finish counter tagged with the owning team.
`,
			"executor-slots": `
Executor slot gauges are tagged per team too.
`,
			"no-tag": `
Global pools, teamless dags and global components emit the same metrics without the tag.
`,
			"coverage": `
Covers the common components:
triggerers (callbacks)
executors
scheduler (pools, dag runs, task instances, etc)
dag processor
`,
			"backend": `
You must be using a metrics backend that supports tagging/multiple dimensions
`,
			"disabled": `
Fully backward compatible
When multi-team is disabled, metrics are emitted exactly as before
`,
		},
	},

	/* ================== asset-filtering ================== */
	"asset-filtering": {
		slide: `
As we saw in the previous slides, now a lot of different resources in Airflow can be team specific. But one is not. Assets.
By design assets are global to the environment, actually one of the goal of assets is to make Airflow environment talking to each, so now we can use it to make teams talking to each other.		

But how does it work in practise? Let's take an example: Team A produces the clickstream asset, Team B schedules on it.
`,
		steps: {
			"blocked": `
1) By default: no cross-team events. Consumers only get events from their own team or from global dags. Team B does not receive the event.
`,
			"allowed": `
2) Consumers have the option ot opt-in: by specifying which teams they trust in 'producer_teams', team B says it accepts events from team_a.
`,
			"prod-blocked": `
3) What if the producer does not want? You have the equivalent option on the producer side: you can controls who may consume the events you are producing. If both are specified like in this example, both need to be satisfied.

So thanks to assets and all these options you can control who talks to who.
`,
		},
	},

	/* ================== misc-notes ================== */
	"misc-notes": {
		slide: `
Some notes
`,
		steps: {
			"cli": `
It is an opt-in feature, you need to enable it to use it.
There is a CLI to manage teams.
`,
			"unique-ids": `
Uniqueness of identifiers stay the same regardless of multi-team, they are global to the environment.
`,
			"advanced": `
The setup needed to rnu Airflow in multi-team mode is pretty advanced and complex, so I would recommend it only for platform engineers at medium-to-large companies.
Even though nothing prevents you to try :)
`,
		},
	},

	/* ================== demo-setup ================== */
	"demo-setup": {
		slide: `
Alright so now we are about to start the fun part, the demo.
But before, let's go through the configuration the demo runs on.
So that we actually understand what we are looking at.
Let's start by the global scope (as a reminder, what is global do not belong to any team, they are global to the environment):
  - it uses LocalExecutor
  - And the user admin has access to all teams
`,
		steps: {
			"team1": `
The first team (there is going to be 2 teams) named team1 uses the LocalExecutor as well and user1 has only access to team1.
`,
			"team2": `
The second team team2 uses the CeleryExecutor and user2 has only access to team2.
`,
			"config": `
The translation of this config in Airflow is this:
- First we enable multi-team
- Then we configure the Dag bundles (one per team and one for the global scope)
- Then we configure the different users (this is specific to simple auth manager so no need to focus in there)
- Then lastly we configure the executors
`,
		},
	},

	/* ================== demo ================== */
	"video-slide1-part1": {
slide: `
To start off, we are going to sign in as the admin, that has access to all the teams.
Once signed in, you can actually see which teams you belong to by clicking on the user icon on the bottom left.
Here we can see that my user admin belongs to team1 and team 2.

Then we can go the Dag list page, here we can see all the Dags from all the teams. We can see which Dag belong to which team.

By clicking on one of these teams, we'll filter the Dags and only display the Dags that belong to team1.

You can of course remove this filter and apply the second team filter to only list Dags that belong to team2.

Now that we saw how the dag bundle configuration we saw before the demo is reflected on the UI.
Now let's try to trigger some Dags.
If you remember well, we saw that global and team1 are using LocalExecutor and team2 is using CeleryExecutor.
`},
	"video-slide1-part2": {
slide: `
Let's first start by triggering example_global (which belongs to global).
Once it is successfull let's look at the logs.
I am using Breeze here (development tool), LocalExecutor is running inside the scheduler and we are going to look at the sceduler component.
Here we can see that example_global has been run using LocalExecutor.

Let's now trigger example_team (which belongs to team2).
Same here, let's look at the logs.
We can see nothing showed up in the scheduler logs so it did not use the LocalExecutor.
Let's look at the celery worker logs.
And thanksfully we can see here that example_team2 used CeleryExecutor.

Now that you know how to have different teams using different executors, let's look at secrets.
In this demo I am using only variables but the same apply for connections as well.
`},
	"video-slide2": {
slide: `
We are going to start by creating some variables:
- Let's start by creating one first variable named global_variable. Assign it a value. And because we want this variable to be global, we wont assign any team.
- Then we'll create our second variable: my_variable, assign it a value as well. And this time we want to associate it to a team: team2. So team2 owns this variable.

Once that done, we are going to use them. Let's look at the Dag example_team2. It is a pretty simple Dag, it just read the variable we just created and print them out.
Let's trigger the Dag. And if we look at the logs, can we can see the Dag successfully read these variables and print them out.

But now let's try to do something funny! Let's try to do the exact same thing but in a different team! Let's try to read these variables in team1.
We have this Dag example_team1, which does exactly the same. It reads the 2 variables. Let's trigger to see what happens. Boum! Failed!
And if we look at the logs we can see the Dag does not have access to my_variable.

Everything worked as expected, a Dag which belongs to team1 tried to access a variable which belongs to team2, and that's why the Dag failed.

Now we are going to see something I mentioned earlier in this talk: the asset filtering.
`},
	"video-slide3-part1": {
slide: `
To do that, let's look at a simple setup. We are going to use one asset here: my_asset. And here we can see the producers and consumers of this asset.
We can see that team1 is a producer of my_asset through example_producer_team1 and team2 is a consumer of my_asset through example_consumer_team2.
`},
	"video-slide3-part2": {
slide: `
Then we are going to trigger the producer to see what happens. Once executed, we are going to look at whether the consumer has been triggered.
Clearly not.
`},
	"video-slide3-part3": {
slide: `
Now we are going to modify our consumer Dag to trust team1 as a producer so that we can receive events from this team.
To do that, we are using the attribute access_control, and by using the AssetAccessControl object we can add team1 as part of producer_teams.
Which means, we trust team1 as producer.

Now we double check that Dag change was saved in Airflow, yes it has.
So now we'll trigger again the producer Dag and we'll if this times it triggers the consumer Dag.

Yes it has!
Because we added team1 as a trustful producer team, the consumer was executed successfully.

Alright, last video now :) I dont know if you noticed but so far we have only used the admin user which has access to all the teams.
Well the whole point of multi-team is to have team specific users right? I can feel you cannot wait to see that so let's do it.
`},
	"video-slide4": {
slide: `
First we are going to sign in as user1, and the same way we did with the admin user we can check the teams this user belongs to. Here team1.
Now if we go to the Dags list, we can only see Dags from team1 and the global Dag as well.
And if we go to variables, in this page we'll only see the global variable because there is no team1 specific variable.

Then now we can try to sign in as user2. Same here, we can check which team this user belongs to.
When we go to the Dags list page, we can only see Dags from team2 and the global one.
And then when we go the variables page, we can see the global variable and the team2 specific variable.

That's it for the demo, I hope you could have a sense of what the multi-team is.
`,
	},

	/* ================== timeline ================== */
	"timeline": {
		slide: `
Before closing this talk, let's go quickly through the release timeline.
Since it is a big feature, its release has been spawned across several Airflow releases.
`,
		steps: {
			"v32": `
3.2 laid clearly the foundation: concept of teams, association with bundles, per-team executors, variables, connections and pools
And even though this is not a Airflow core release, Keycloak auth manager was released at about the same time.
Which is the auth manager compatible with multi-team.
`,
			"v33": `
3.3 added the triggerer per team, XCom scoping, pool CLI and scheduler enforcement, asset event filtering and team metrics.
3.2 and 3.3 delivered most of the features of multi-team.
`,
			"v34": `
In 3.4 it is mostly follows up and nice to have such as the remaining UI elements, plugin support, command/secrets lookup for team config, plus auto-created team default pools.
`,
			"experimental": `
Quick note. This is still experimental through at least 3.4, feedback is super welcome, please try it, please break it. Thank you.
`,
		},
	},

	/* ================== questions ================== */
	"questions": {
		slide: `
Thank you! Scan for LinkedIn and the Multi-Team documentation.
Also check out Vincent's Keycloak auth manager deep dive session at this summit.
`,
	},
};
