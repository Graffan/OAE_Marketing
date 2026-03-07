# OAE Marketing — Project Brief

OAE Marketing App
Working title
OAE¬_Marketing
Purpose
Build an internal marketing operating system for Other Animal Entertainment Inc. that helps a very small team market films, drive viewership, and increase engagement without needing a full in-house marketing department.
The app should centralize film assets, regional viewing links, campaign planning, social clip generation, AI-assisted copy, approval, publishing, and performance reporting.
Product goal
Give OAE one place to:
•	store each title's trailers, clips, posters, press materials, and approved copy
•	generate channel-specific social posts and campaign ideas with AI
•	manage country and region-specific viewing links for each film
•	publish or prepare posts that push audiences to the correct destination by territory
•	measure what is working across titles, clips, platforms, and regions
Why this matters
OAE appears to operate as a lean genre-focused production, post-production, and distribution company with a small core team and no visible dedicated marketing team. The site currently highlights productions and company credentials, but it does not appear to present a strong viewer marketing funnel, territory-aware watch links, campaign automation, or audience capture workflow.
That creates a gap:
•	films exist
•	audiences can be reached through clips and social content
•	but the distribution path is fragmented by territory and platform
•	and the team needs an internal system to keep marketing output consistent and fast
Business problem
The current marketing process is likely manual, fragmented, and dependent on memory, spreadsheets, and ad hoc posting.
That makes it hard to:
•	push titles consistently across social channels
•	know which clip should be posted where and when
•	route viewers to the correct regional watch destination
•	reuse successful messaging patterns
•	track whether a campaign actually moved viewers to trailers, shops, rentals, streamers, or purchases
Product vision
OAEmarketing is not just a scheduler. It is a film marketing command center designed for independent genre distribution.
It combines:
•	territory-aware link routing
•	content planning and asset management
•	AI-assisted marketing workflows
•	Claude Code marketing skills as embedded operator logic
•	reporting that ties clips and posts to views, clicks, and downstream engagement
Primary users
1. Internal marketing operator
Likely Geoff or another OAE team member handling campaigns directly.
Needs:
•	speed
•	clear workflows
•	strong AI support
•	minimal setup friction
2. Executive / producer view
Needs fast visibility into:
•	what is being pushed this week
•	which titles are getting attention
•	which regions need coverage
•	what clips and campaigns are performing
3. External freelancer or agency support
If OAE later brings in part-time marketing help, the app should make the process legible and repeatable.
Core use cases
Territory-aware distribution
For each title, store viewing destinations by:
•	country
•	region
•	platform
•	deal window
•	link type
•	availability dates
Example:
A user in Canada clicking a post for Poor Agnes may need Apple TV or a distributor link, while a user in the US may need Amazon, Tubi, or another platform.
The app should generate one smart campaign link that resolves to the correct territory destination.
Social clip operations
For each film, upload source clips and tag them by:
•	hook type
•	spoiler level
•	tone
•	characters
•	gore / intensity level
•	duration
•	platform suitability
•	campaign objective
The app should use AI to propose:
•	caption variants
•	platform-specific edits
•	hashtag sets
•	posting angles
•	CTA variants
•	audience segment hypotheses
•	best next clip to post based on what has not yet been used
The app should also track:
•	which clips have been posted
•	where they were posted
•	when they were posted
•	whether they should be held back from repeat use
Campaign planning
Build campaigns around:
•	title launches
•	seasonal horror pushes
•	festival / award moments
•	talent moments
•	trailer drops
•	watch-now pushes
•	catalog revival pushes
Performance tracking
Track:
•	clicks by region
•	post engagement by platform
•	view-through to trailer or watch page
•	top performing hooks
•	top performing clips by title
•	best CTA by region
App principles
•	Made for a tiny team
•	Fewer screens, stronger workflows
•	AI should reduce work, not create extra review burden
•	Every asset should map to a title and campaign goal
•	Regional routing is a core feature, not an add-on
•	Human approval remains the final gate for publishing
Product scope
In scope for v1
1.	Title catalog management
2.	Asset library
3.	Regional link database
4.	Smart watch-link router
5.	AI content generator
6.	Campaign planner
7.	Social post builder
8.	Approval workflow
9.	Analytics dashboard
10.	Claude marketing skills integration layer
Out of scope for v1
•	full video editing suite
•	enterprise CRM
•	ad buying platform replacement
•	public fan community platform
•	rights management system beyond light metadata
Film/title data model
Each title record should include:
•	title name
•	status
•	runtime
•	genre / subgenre
•	synopsis short
•	synopsis long
•	key selling points
•	mood / positioning
•	release milestones
•	trailer links
•	stills / posters
•	press kit files
•	cast / crew highlights
•	awards / festivals
•	spoiler guidelines
•	approved brand voice notes
Regional availability model
Each title can have many regional destinations.
Fields:
•	title_id
•	country_code
•	region_name if needed
•	platform_name
•	platform_type
•	destination_url
•	cta_label
•	language
•	start_date
•	end_date
•	status active / expired / upcoming
•	campaign_priority
•	tracking parameters template
Asset model
Each asset should include:
•	title_id
•	project_id
•	asset_type
•	file_url
•	source_storage_provider
•	source_folder_path
•	source_file_id
•	duration
•	orientation
•	language
•	rating sensitivity
•	spoiler level
•	approved yes/no
•	hook category
•	emotional promise
•	notes
•	posted_status
•	times_posted
•	last_posted_at
•	last_posted_platform
•	last_posted_region
•	engagement_score
•	ai_recommendation_status
Cloud storage by project
This is a required feature, not a convenience.
OAE needs cloud-based clip access organized by project so the team can work from existing folders instead of rebuilding the asset process inside the app.
Primary requirement
Connect cloud storage, starting with Dropbox, at the project level.
Each film or project should be able to connect to:
•	one root project folder
•	subfolders for trailers, posters, stills, viral clips, subtitles, and press assets
•	one designated viral clips folder used by the campaign system
Why this matters
The real operating model is likely:
•	clips already live in shared cloud folders
•	different films have different asset organization
•	the team needs fast access to approved posting material
•	the app must know what has already been posted and what is still unused
So OAEmarketing should not force manual re-upload for every clip. It should index cloud folders and sync metadata into the app.
Dropbox/project folder model
For each project:
•	connect Dropbox account or shared team space
•	assign a root folder
•	mark one or more folders as Postable Clips
•	ingest file metadata and preview data
•	allow manual approval or exclusion per clip
Example structure:
•	/Poor Agnes/Posters
•	/Poor Agnes/Stills
•	/Poor Agnes/Trailers
•	/Poor Agnes/Viral Clips
•	/Poor Agnes/Subtitles
•	/Poor Agnes/Press
Cloud storage features
•	Dropbox integration first
•	extensible structure for Google Drive or other storage later
•	per-project folder mapping
•	automatic sync of new files
•	thumbnail and preview generation
•	searchable clip library across all connected projects
•	file status: new, approved, posted, archived, excluded
•	audit trail for who approved or excluded a clip
Viral clip library
Each project should have a dedicated viral clip library sourced from cloud storage.
Each clip record should include:
•	project_id
•	title_id
•	cloud_source
•	folder_path
•	file_id
•	original_filename
•	display_name
•	duration
•	orientation
•	transcript if available
•	subtitle availability
•	hook type
•	theme
•	character focus
•	spoiler level
•	gore / intensity level
•	platform suitability
•	posting priority
•	approval status
•	posted_count
•	regions_posted_to
•	platforms_posted_to
•	first_posted_at
•	last_posted_at
•	total_engagement_score
•	notes from human reviewers
•	AI tags and campaign suggestions
Posted clip tracking and rotation logic
This is another core system feature.
The app should track which clips have already been posted so OAE does not keep repeating the same assets too early.
Rotation rule
Default logic:
•	do not repeat a clip until all approved clips in the active campaign pool have been used
•	once the pool has been exhausted, re-rank clips using engagement and recency
•	then begin a second cycle using the strongest performers and new AI recommendations
Rotation controls
Allow the operator to choose:
•	no repeat until pool exhausted
•	repeat only top performers after X days
•	region-specific reuse allowed
•	platform-specific reuse allowed
•	manual override for priority clips
Posting history model
Every post using a clip should create a history record with:
•	clip_id
•	title_id
•	campaign_id
•	platform
•	region
•	post_date
•	post_url if available
•	caption version
•	CTA version
•	smart_link_id
•	engagement metrics snapshot
Status logic
A clip can be:
•	unposted
•	scheduled
•	posted
•	retired
•	needs review
•	high performer
•	low performer
Campaign intelligence loop
The app should learn from posted clips over time.
AI plus human refinement loop
After posting, the system should evaluate clip performance using both data and human judgment.
Inputs:
•	engagement data
•	click-through data
•	watch intent proxy metrics
•	platform and region context
•	operator notes
•	creative observations from humans
Outputs:
•	recommend which hooks to double down on
•	recommend which clips to retire
•	suggest new caption angles for weak clips
•	identify strong clip patterns by region and platform
•	suggest when a previously used clip is worth resurfacing
Human input layer
Humans should be able to tag why a clip worked or failed:
•	strong opening image
•	too slow in first 2 seconds
•	spoiler too high
•	gore performed well
•	character performed well
•	comedy beat underperformed
•	CTA mismatch
•	wrong platform fit
That feedback should be stored and exposed to AI workflows.
Clip performance analytics
Analytics should not stop at the post level. The app needs clip-level intelligence.
Track per clip:
•	impressions
•	plays/views
•	completion rate if available
•	likes
•	comments
•	shares
•	saves
•	click-throughs
•	region response
•	platform response
•	best caption pairings
•	best CTA pairings
•	reuse recommendation score
The app should rank clips by:
•	raw engagement
•	weighted engagement
•	click efficiency
•	regional fit
•	platform fit
•	reuse potential
Key workflows
Workflow 1: Add a new title
1.	Create title
2.	Upload posters, trailers, stills, clips
3.	Add regional watch links
4.	Define audience segments
5.	Define approved tone and positioning
6.	Generate starter campaign kit
Workflow 2: Build a social campaign
1.	Choose title
2.	Choose goal: awareness, engagement, trailer, watch-now
3.	Select target regions
4.	Pull approved clips from the connected project cloud folder
5.	Let AI recommend unposted or high-potential clips
6.	Generate post copy by platform
7.	Generate smart destination links
8.	Review clip history to avoid premature repeats
9.	Review and approve
10.	Export or publish
Workflow 3: Weekly marketing sprint
1.	Dashboard shows under-promoted titles and regions
2.	AI recommends campaign opportunities
3.	Operator selects top ideas
4.	App creates draft content batch
5.	Operator approves and schedules
6.	Dashboard reports outcomes
Claude Code / AI layer
Use Claude Code as the planning and marketing intelligence engine inside the product workflow.
Best-fit skills from the marketingskills repo
•	product-marketing-context
•	content-strategy
•	social-content
•	copywriting
•	copy-editing
•	launch-strategy
•	analytics-tracking
•	ad-creative
•	paid-ads
•	ai-seo
•	site-architecture
•	marketing-ideas
•	marketing-psychology
How they should be used in the app
1. Product marketing context
Create one OAE master context file and one context block per title.
This should define:
•	company positioning
•	audience profile
•	genre niche
•	title promise
•	tone boundaries
•	platform priorities
•	geographic distribution realities
2. Social content skill
Used to generate:
•	Instagram captions
•	TikTok hooks
•	X posts
•	YouTube Shorts copy
•	paid social variants
•	repost variations for catalog pushes
3. Copywriting and copy editing
Used for:
•	landing page copy
•	title page rewrites
•	synopsis variants
•	CTA testing
•	email copy
•	press blurbs
4. Analytics tracking
Used to define naming conventions, campaign tags, UTM structure, and reporting logic.
5. Launch strategy
Used for title release pushes, trailer drops, and territory-specific availability announcements.
6. AI SEO and site architecture
Used if OAE later expands title pages, watch pages, blog content, press pages, or collection pages.
AI features inside OAEmarketing
1. Campaign brief generator
Input:
•	title
•	goal
•	region
•	platform
•	release moment
Output:
•	audience angle
•	hook ideas
•	clip recommendations
•	CTA options
•	posting cadence
•	test suggestions
2. Clip-to-post generator
Input a clip and get:
•	headline / hook
•	short caption
•	longer caption
•	CTA
•	region-aware link
•	hashtag set
•	platform recommendations
•	repeat / do-not-repeat recommendation based on posting history
•	performance-informed recommendations if the clip has been used before
3. Territory release assistant
Input title and date range.
Output:
•	regions with active deals
•	missing watch links
•	expiring windows
•	posts that can be generated now
4. Catalog revival assistant
Suggest older titles to push based on:
•	seasonality
•	recent genre trends
•	awards or anniversaries
•	engagement history
5. Performance summarizer
Weekly AI summary:
•	what worked
•	what failed
•	best hooks
•	underused assets
•	next actions
Recommended app modules
1. Dashboard
Shows:
•	campaigns in flight
•	titles needing attention
•	regional link gaps
•	top performing posts
•	expiring deals
•	AI recommendations
•	unposted viral clips by project
•	clip rotation status
•	clips ready for repost testing after pool exhaustion
2. Titles
A database view of all films and projects.
3. Assets
Central asset library with search and tagging.
This module should also surface connected cloud storage folders by project and provide a filtered view of all postable viral clips.
4. Destinations
Regional watch-link manager and routing rules.
5. Campaigns
Plan, draft, review, publish, and measure campaigns.
6. AI Studio
Prompted workflows powered by Claude plus the selected marketing skills.
7. Analytics
Views by title, platform, region, campaign, and asset.
8. Settings / Integrations
Social channels, analytics accounts, storage, user roles, AI settings.
Key integrations
Must-have
•	Claude Code or Claude API workflow layer
•	GitHub repo integration for marketingskills
•	cloud file storage integration, starting with Dropbox
•	project-level folder mapping
•	short-link / redirect service
•	analytics store
Strongly recommended
•	YouTube
•	Instagram / Facebook through Meta workflows
•	TikTok export workflow
•	X export workflow
•	Letterboxd monitoring inputs
•	Google Analytics or equivalent measurement stack
Suggested technical approach at the product level
Even if you do not want to code personally, the app idea should be structured so a dev team can build it cleanly.
Architecture direction
•	internal web app
•	modular admin-style interface
•	API-first backend
•	asset storage separated from app database
•	routing service for territory-aware watch links
•	AI orchestration service for prompts, templates, and output logging
Core system layers
1.	Frontend app
2.	Backend API
3.	Database
4.	Asset storage and cloud sync layer
5.	AI orchestration layer
6.	Link redirection / tracking layer
7.	Analytics pipeline
8.	posting history and clip rotation engine
Suggested MVP
MVP objective
Prove that OAE can move faster and smarter on marketing output with one internal tool.
MVP features
•	add films
•	connect Dropbox folders by project
•	sync and tag viral clips
•	upload clips and posters when needed
•	add country-specific watch links
•	generate social post drafts with AI
•	prevent accidental repeat posting until the active clip pool is exhausted
•	create one smart link per campaign
•	export posts for manual publishing
•	basic dashboard for clicks and engagement
•	clip-level performance tracking
This is enough to prove the core loop:
cloud clip library -> AI draft -> regional link -> post -> engagement + click tracking -> refine next campaign
Example user stories
•	As an OAE operator, I want to upload a clip for Poor Agnes and instantly get TikTok, Instagram, and X post drafts so I can publish faster.
•	As an OAE operator, I want one campaign link that routes viewers in Canada, the US, and the UK to different destinations so I do not need separate manual workflows.
•	As an OAE operator, I want to know which clips drove the most watch intent by region so I can reuse winning patterns.
•	As an executive, I want to see which titles are under-promoted this month so I can focus attention where it matters.
Success metrics
Operating metrics
•	time to create a campaign
•	number of posts shipped per week
•	titles promoted per month
•	regions covered per campaign
•	percentage of projects connected to cloud storage
•	percentage of approved clips with complete metadata
•	reduction in duplicate clip posting before pool exhaustion
Outcome metrics
•	click-through rate to watch destinations
•	engagement rate per platform
•	trailer views
•	watch-page visits
•	regional conversion proxy metrics
•	catalog title reactivation
•	clip reuse lift after performance-informed rotation
•	improvement in engagement after AI plus human refinement
Risks
•	watch-link data becomes stale
•	AI generates off-brand copy
•	too many features create operational drag
•	social platform publishing integrations become fragile
•	rights / territory windows change faster than the team updates them
Risk controls
•	expiration rules for links
•	human approval before publishing
•	title-level voice guardrails
•	campaign templates rather than fully open-ended prompting
•	audit log for AI outputs and edits
•	cloud sync health monitoring
•	clip approval gates before entering the active posting pool
•	repeat-post safeguards with manual override
Recommended roadmap
Phase 1: Foundation
•	title records
•	asset library
•	region-aware links
•	AI post generation
•	manual export
Phase 2: Measurement
•	campaign tracking
•	post performance dashboard
•	recommendation engine
•	A/B testing for hooks and CTAs
Phase 3: Expansion
•	direct publishing integrations
•	email and press workflows
•	OAE site page generation
•	AI SEO pages by title / collection / territory
Initial positioning statement for the product
OAEmarketing is a territory-aware AI marketing system built for independent film distribution teams that need to turn one catalog of titles into many region-specific campaigns without hiring a full marketing department.
Recommended next deliverables
1.	Product requirements document
2.	Information architecture
3.	user flow maps
4.	database schema draft
5.	AI prompt library
6.	campaign taxonomy
7.	naming and analytics conventions
8.	MVP screen list
 
Build Blueprint (for development in VS Code)
This section translates the product design into something that can be implemented by a developer or AI coding assistant.
The goal is to keep the architecture simple, modular, and maintainable.
 
Core database schema (initial draft)
titles
Stores all films or projects.
Fields:
•	id
•	title_name
•	status
•	release_year
•	runtime
•	genre
•	subgenre
•	synopsis_short
•	synopsis_long
•	marketing_positioning
•	created_at
•	updated_at
projects
Allows a project wrapper if needed (for series, collections, or alternate versions).
Fields:
•	id
•	title_id
•	project_name
•	cloud_provider
•	cloud_root_path
•	viral_clip_folder_path
•	created_at
assets
General asset table.
Fields:
•	id
•	title_id
•	project_id
•	asset_type
•	file_url
•	storage_provider
•	folder_path
•	duration
•	orientation
•	language
•	spoiler_level
•	approved
•	created_at
clips
Dedicated viral clip table.
Fields:
•	id
•	title_id
•	project_id
•	asset_id
•	cloud_file_id
•	filename
•	duration
•	orientation
•	hook_type
•	theme
•	character_focus
•	spoiler_level
•	intensity_level
•	platform_fit
•	approval_status
•	posted_count
•	engagement_score
•	created_at
clip_posts
Tracks every time a clip is posted.
Fields:
•	id
•	clip_id
•	campaign_id
•	platform
•	region
•	post_date
•	post_url
•	caption
•	cta
•	smart_link_id
•	impressions
•	views
•	likes
•	comments
•	shares
•	clicks
campaigns
Campaign container.
Fields:
•	id
•	title_id
•	campaign_name
•	campaign_goal
•	start_date
•	end_date
•	regions
•	status
smart_links
Territory routing links.
Fields:
•	id
•	title_id
•	campaign_id
•	default_url
•	created_at
regional_destinations
Where viewers actually go.
Fields:
•	id
•	title_id
•	country_code
•	region
•	platform_name
•	platform_type
•	destination_url
•	start_date
•	end_date
analytics_events
Central analytics event table.
Fields:
•	id
•	event_type
•	entity_type
•	entity_id
•	region
•	platform
•	metric_value
•	timestamp
 
Core screens for the MVP
1 Dashboard
Shows:
•	campaigns running
•	titles needing promotion
•	unposted viral clips
•	expiring regional deals
•	top performing clips
Widgets:
•	campaign activity
•	clip rotation status
•	engagement leaderboard
2 Titles
Database view of all films.
Features:
•	create title
•	edit title
•	view assets
•	view campaigns
3 Projects
Project-level configuration.
Features:
•	connect Dropbox folder
•	define viral clip folder
•	sync cloud files
4 Clip Library
Central viral clip browser.
Features:
•	filter by title
•	filter by platform suitability
•	filter by posted/unposted
•	preview clips
5 Campaign Builder
Workflow for building a campaign.
Steps:
1 select title
2 select regions
3 select clips
4 generate copy
5 generate smart links
6 export posts
6 AI Studio
Interface for running marketing skills.
Tools:
•	generate captions
•	campaign ideas
•	hook testing
•	audience angles
7 Destination Manager
Controls regional watch links.
Features:
•	add region platform link
•	edit deal windows
•	generate smart campaign link
8 Analytics
Performance tracking.
Views:
•	by clip
•	by campaign
•	by region
•	by platform
 
Suggested repository structure
Example project structure when starting development in VS Code.
/app
/api
routes
controllers
services
/database
schemas
migrations
/modules
campaigns
clips
titles
links
analytics
ai
/integrations
dropbox
social
claude
/ui
components
pages
/utils
helpers
tracking
/config
 
AI prompt architecture
The AI system should use structured prompts instead of free-form prompting.
Each prompt should include:
Context
•	OAE brand context
•	title context
•	campaign goal
Input
•	clip metadata
•	region
•	platform
Output format
•	hook
•	caption
•	hashtags
•	CTA
Store prompts in a prompt library so results can be improved over time.
 
Claude marketing skills integration
The marketingskills repo should be used as the reasoning layer for the AI workflows.
Recommended modules:
•	product-marketing-context
•	content-strategy
•	social-content
•	copywriting
•	launch-strategy
•	analytics-tracking
•	marketing-ideas
Each AI action inside the app should call one of these skills with structured inputs.
 
Development milestone plan
Phase 1
Core system
•	titles
•	projects
•	Dropbox connection
•	clip sync
•	clip library
Phase 2
Campaign tools
•	campaign builder
•	AI caption generator
•	smart links
Phase 3
Analytics
•	clip performance tracking
•	campaign analytics
•	AI optimization
 
Final note
The app should be treated as an internal film marketing operating system rather than a social media tool.
Its real advantage is combining:
•	territory aware distribution
•	organized clip libraries
•	AI campaign generation
•	performance driven clip rotation
This is the marketing infrastructure most independent film companies never build but badly need.
 
Additional Product Requirements (Multi User, Governance, and UI)
These sections expand the system so it works for multiple users and remains clear, reliable, and scalable.
 
User roles and permissions
The system must support multiple user roles with controlled access.
Roles
Admin
Full system control.
Permissions:
•	manage users
•	connect cloud storage
•	edit regional links
•	manage AI settings
•	override campaign rules
•	view all analytics
Marketing Operator
Primary daily user.
Permissions:
•	create campaigns
•	generate AI copy
•	select clips
•	schedule/export posts
•	edit captions
•	tag clips
Reviewer / Approver
Creative or executive review role.
Permissions:
•	approve clips
•	approve campaigns
•	approve captions
•	reject or request edits
Executive / Producer (Read Only)
High-level oversight.
Permissions:
•	view dashboards
•	view campaign reports
•	view analytics
External Freelancer
Limited scope access.
Permissions:
•	access assigned projects
•	upload clips
•	draft posts
•	no access to global settings
 
Content state model
Clear state management prevents confusion.
Clip states
•	new
•	awaiting review
•	approved
•	rejected
•	scheduled
•	posted
•	archived
Campaign states
•	draft
•	AI generated
•	awaiting approval
•	approved
•	scheduled
•	active
•	completed
Destination link states
•	active
•	expiring soon
•	expired
•	missing
 
Rights and restrictions
Film marketing often has restrictions tied to deals and distribution agreements.
Clips and campaigns must support restrictions such as:
•	region restrictions
•	spoiler sensitivity
•	embargo dates
•	platform limitations
•	distributor approval requirements
Fields may include:
•	allowed_regions
•	restricted_regions
•	embargo_date
•	distributor_notes
 
Scheduling and calendar system
Campaign scheduling must account for multiple regions and platforms.
Features:
•	calendar view
•	queue management
•	timezone handling
•	platform cadence planning
•	blackout dates
•	recommended posting times
Views:
•	weekly view
•	platform timeline
•	campaign timeline
 
Content versioning
All editable content must support version history.
Track changes to:
•	captions
•	CTAs
•	links
•	campaign parameters
Version records should include:
•	version number
•	editor
•	timestamp
•	change notes
 
Source of truth rules
To avoid sync confusion:
Cloud storage
Source of truth for raw files.
App database
Source of truth for metadata, tags, and approvals.
Regional destinations table
Source of truth for distribution links.
Campaign history
Source of truth for posting history.
 
Failure handling
The system must detect and respond to operational issues.
Possible failures:
•	cloud sync interruption
•	deleted source files
•	expired destination links
•	analytics import errors
System responses:
•	dashboard alerts
•	retry sync operations
•	mark assets as unavailable
•	notify administrators
 
Analytics definitions
Performance metrics must be defined clearly.
Engagement score
Weighted score using:
•	likes
•	comments
•	shares
•	saves
•	view duration
Clip performance score
Combination of:
•	engagement
•	click-through rate
•	region response
•	platform response
Repost eligibility
Determined by:
•	engagement threshold
•	days since last post
•	campaign pool exhaustion
 
Notifications system
Users should receive alerts for important events.
Examples:
•	new clips synced
•	campaign approval required
•	destination link expiring
•	clip pool exhausted
•	strong performing clip detected
 
Reporting and exports
The system should support shareable reports.
Possible exports:
•	campaign summary
•	clip performance report
•	regional distribution report
•	CSV analytics export
•	PDF summary for executives
 
Audit log
Track major system actions.
Examples:
•	clip approval
•	campaign approval
•	link changes
•	rotation overrides
•	AI output edits
Each entry should include:
•	user
•	action
•	timestamp
•	object affected
 
UI design principles
The UI must prioritize clarity and speed for a small team.
Principles:
•	minimal clicks for common tasks
•	visible clip previews
•	strong visual indicators for campaign status
•	clear warnings for duplicate posting
 
Important UI components
Clip preview panel
Must include:
•	playable preview
•	metadata
•	posting history
•	engagement stats
Clip rotation indicator
Shows:
•	clips used
•	clips remaining
•	clips eligible for reuse
Example:
18 of 26 clips used
8 remaining
Campaign workspace
A visual builder including:
•	clip selection
•	caption generator
•	region selector
•	link preview
Smart link tester
Allows testing by country.
Example:
Canada → Apple TV
US → Amazon
UK → Tubi
Duplicate warning
When a clip is reused too soon:
Display:
•	last post date
•	last platforms
•	suggested alternatives
Human feedback panel
Structured feedback fields:
•	opening strength
•	pacing
•	spoiler risk
•	platform fit
•	CTA effectiveness
 
Asset health dashboard
A dedicated screen highlighting operational issues.
Examples:
•	unsynced projects
•	missing metadata
•	titles with no viral clips
•	regions missing watch links
•	expired distribution links
 
Bulk actions
To improve workflow speed.
Supported actions:
•	bulk approve clips
•	bulk tag clips
•	bulk archive clips
•	bulk assign campaign
 
Setup and onboarding flow
First-time setup should guide users through:
1 create company profile
2 connect cloud storage
3 add titles
4 configure regional links
5 import clips
6 define campaign templates
 
Template system
Reusable marketing templates should exist for common scenarios.
Examples:
•	new title launch
•	trailer release
•	watch now campaign
•	seasonal promotion
•	catalog revival
 
Long term platform expansion
Future features that may be added:
•	paid ad campaign management
•	automated post publishing
•	AI trailer cut suggestions
•	region specific landing pages
•	fan audience capture tools
 
Key design philosophy
The system should feel like a marketing command center for independent film distribution.
It combines:
•	cloud clip management
•	campaign planning
•	territory routing
•	AI creative generation
•	analytics feedback loops
The UI must remain simple enough for a small team while powerful enough to scale as the film catalog grows.
 
API Architecture
The backend should expose a clean REST API so the frontend, automation tools, and AI workflows can interact with the system consistently.
Core API domains
Titles API
Endpoints:
•	GET /api/titles
•	POST /api/titles
•	GET /api/titles/{id}
•	PUT /api/titles/{id}
•	DELETE /api/titles/{id}
Purpose:
Manage the catalog of films and projects.
Projects API
Endpoints:
•	GET /api/projects
•	POST /api/projects
•	GET /api/projects/{id}
•	PUT /api/projects/{id}
Purpose:
Map projects to cloud storage and clip folders.
Clips API
Endpoints:
•	GET /api/clips
•	POST /api/clips
•	GET /api/clips/{id}
•	PUT /api/clips/{id}
•	GET /api/clips/unposted
Purpose:
Manage viral clip metadata and rotation logic.
Campaign API
Endpoints:
•	GET /api/campaigns
•	POST /api/campaigns
•	GET /api/campaigns/{id}
•	PUT /api/campaigns/{id}
Purpose:
Create and manage marketing campaigns.
Clip Post History API
Endpoints:
•	GET /api/clip-posts
•	POST /api/clip-posts
•	GET /api/clips/{id}/history
Purpose:
Track posting history for rotation and analytics.
Smart Link API
Endpoints:
•	POST /api/links
•	GET /api/links/{id}
•	GET /api/links/{id}/resolve
Purpose:
Generate and resolve territory-aware campaign links.
Regional Destination API
Endpoints:
•	GET /api/destinations
•	POST /api/destinations
•	PUT /api/destinations/{id}
Purpose:
Manage regional streaming or purchase destinations.
Analytics API
Endpoints:
•	GET /api/analytics/clips
•	GET /api/analytics/campaigns
•	GET /api/analytics/regions
Purpose:
Retrieve performance data.
 
Smart Link Redirect Architecture
Smart links allow one campaign URL to route users to different destinations depending on region.
Example flow:
User clicks campaign link
System detects region using:
•	IP geolocation
•	browser locale
•	optional query override
System checks:
regional_destinations table
If match exists:
Redirect user to correct streaming platform
If no match exists:
Fallback to default destination
Example URL:
watch.otheranimal.app/pooragnes
Resolution example:
Canada → Apple TV
US → Amazon
UK → Tubi
Tracking parameters should be appended for analytics.
 
Dropbox Sync Architecture
Dropbox will be used as the primary cloud source for clip libraries.
Sync process
1.	User connects Dropbox account
2.	User selects project root folder
3.	System scans folder structure
4.	Files inside "Viral Clips" folder are indexed
5.	Metadata stored in clips table
6.	Thumbnails generated
7.	New files detected via periodic sync
Sync strategies
Option 1: Scheduled polling
Example:
Every 10 minutes check folder for changes
Option 2: Webhook events
Dropbox webhook triggers sync event.
Recommended approach:
Webhook first, polling fallback.
 
Clip Rotation Algorithm
The system must prevent excessive repetition of clips.
Algorithm rules
Step 1
Filter clips by:
•	approved status
•	platform compatibility
•	region restrictions
Step 2
Remove clips already posted in the current rotation cycle.
Step 3
If unused clips exist:
Select highest priority clip.
Step 4
If all clips used:
Start new cycle.
Re-rank clips by:
•	engagement score
•	time since last post
•	platform performance
Step 5
Return top candidate clips.
Operators can override this rule if needed.
 
AI Campaign Recommendation Engine
AI should analyze clip and campaign data to recommend new marketing actions.
Inputs:
•	clip engagement metrics
•	regional performance
•	campaign history
•	platform trends
Outputs:
•	recommended clips
•	suggested hooks
•	caption ideas
•	best posting time
•	regions needing promotion
Example recommendation:
"Clip 17 has strong engagement in Canada and UK on TikTok. Recommend repost in US market with new caption angle."
 
UI Wireframe Concepts
These wireframes describe layout ideas for key screens.
Dashboard layout
Top section:
Campaign summary cards
Middle section:
Clip performance charts
Right panel:
AI recommendations
Bottom section:
Recent activity feed
 
Clip Library screen
Left panel:
Filters
•	title
•	platform
•	posted/unposted
•	engagement score
Center grid:
Video thumbnails
Right panel:
Clip metadata
•	duration
•	hook type
•	engagement stats
 
Campaign Builder screen
Left column
Campaign setup
•	title
•	goal
•	region
Center
Clip selection area
Right column
AI generated captions
Link preview
Approval buttons
 
Open Movie Database (OMDb) Integration
The Open Movie Database API can automatically populate film metadata.
Official site:
https://www.omdbapi.com
Purpose
Reduce manual entry when adding titles.
Automatically import:
•	title
•	year
•	runtime
•	genres
•	director
•	actors
•	poster
•	IMDb rating
•	plot summary
Setup
1.	Register for API key
2.	Store key in environment configuration
Example:
OMDB_API_KEY=yourkey
Example request
GET request:
http://www.omdbapi.com/?apikey=APIKEY&t=Poor+Agnes
Example fields returned:
•	Title
•	Year
•	Genre
•	Runtime
•	Director
•	Actors
•	Plot
•	Poster
Import workflow
When user creates a new title:
1.	Enter film name
2.	System queries OMDb
3.	Display results
4.	User confirms correct match
5.	Data stored in titles table
Fields can still be edited manually.
 
External Metadata Sources (Future)
Additional APIs may be integrated later:
•	TMDB API
•	IMDb data providers
•	Letterboxd data scraping
•	streaming platform availability APIs
These could enhance analytics and marketing insights.
 
Multi-Model AI Strategy (Claude, ChatGPT, and DeepSeek)
The app should not depend on a single model provider.
OAEmarketing should support a multi-model AI layer so work can continue when one provider hits usage limits, has latency issues, becomes unavailable, or is too expensive for a given task.
The system should support:
•	Claude as a primary reasoning and workflow engine
•	ChatGPT via the OpenAI API
•	DeepSeek via the DeepSeek API
•	manual non-API workflows using the web interfaces when needed
This is not just a convenience feature. It is operational resilience.
 
AI provider routing layer
The backend should include a provider abstraction layer so the app can switch models without changing product workflows.
Provider abstraction goals
•	one internal interface for all model calls
•	configurable provider priority
•	fallback when a provider fails
•	token and cost tracking per request
•	prompt logging by provider
•	output comparison when needed
Example internal provider interface
Inputs:
•	task_type
•	system_prompt
•	user_prompt
•	model_preference
•	max_output
•	temperature if supported
Outputs:
•	provider_name
•	model_name
•	response_text
•	usage metrics
•	latency
•	error state
 
Suggested provider roles
Claude
Best used for:
•	long-form reasoning
•	campaign planning
•	structured marketing strategy
•	clip analysis with strong instructions
•	using the marketingskills workflow layer
ChatGPT / OpenAI API
Best used for:
•	copy generation
•	fast rewrites
•	structured JSON outputs
•	metadata cleanup
•	fallback for campaign tasks
OpenAI's API uses API keys with Bearer authentication and recommends keeping keys server-side rather than exposing them in client code. Access to some advanced models and capabilities may depend on organization verification and usage tier. (platform.openai.com)
DeepSeek API
Best used for:
•	lower-cost drafting and experimentation
•	alternate reasoning pass
•	backup generation when other providers are limited
•	comparative output testing
DeepSeek documents Bearer-auth API access and states that its API is OpenAI-compatible at the request format level when pointed at the DeepSeek base URL. DeepSeek also documents token-based billing and streaming options. (api-docs.deepseek.com)
 
Provider fallback rules
The system should support automatic and manual fallback.
Automatic fallback
Example routing logic:
1.	Try primary provider for task
2.	If request fails, times out, or hits a configured provider limit
3.	Retry on secondary provider
4.	Log provider switch in audit history
Manual fallback
The user should be able to choose:
•	use Claude
•	use ChatGPT
•	use DeepSeek
•	compare outputs across providers
Task-based routing examples
•	strategic campaign brief -> Claude first
•	caption batch generation -> ChatGPT or DeepSeek
•	metadata extraction -> ChatGPT first
•	cheap ideation run -> DeepSeek first
 
Token and cost control strategy
The app should treat token usage as a managed resource.
Required controls
•	per-provider usage tracking
•	per-user usage tracking
•	per-project usage tracking
•	request size estimation before send
•	max output controls
•	prompt template reuse to reduce waste
•	response caching for repeated tasks
OpenAI and DeepSeek both document token-based usage and billing concepts, and OpenAI also documents response-length controls for limiting outputs. (help.openai.com)
Practical rules
•	use smaller prompts for caption generation
•	do not resend full title context when cached context can be referenced
•	cache reusable film metadata and audience profiles
•	summarize long conversation state before sending to an API
•	use cheaper providers for first-pass ideation
•	reserve premium reasoning models for higher-value tasks
 
Non-API interface mode
The system should support a manual fallback mode that does not depend on direct API calls.
Why this matters
If Claude or another provider reaches a hard usage limit, the team still needs to keep working.
Non-API mode concept
The app should allow users to:
•	copy structured prompts into Claude web, ChatGPT web, or DeepSeek web
•	paste returned results back into OAEmarketing
•	label which provider and model were used
•	save the imported output to campaign history
This mode should be treated as a first-class fallback workflow.
Non-API helper features
•	one-click copy prompt
•	prompt package export
•	result paste/import box
•	provider label selector
•	output validation before save
Suggested use cases
•	Claude web used after API quota issue
•	ChatGPT web used for fast rewrite pass
•	DeepSeek web used for low-cost alternate angle generation
Note:
The exact limits and behavior of web interfaces can change over time and may differ from API limits, so the app should treat web-interface mode as manual fallback rather than assuming consistent automated capacity. (help.openai.com)
 
AI task registry
The app should define which AI tasks exist and which providers are preferred for each one.
Example registry fields:
•	task_name
•	description
•	preferred_provider
•	fallback_provider
•	low_cost_provider
•	requires_json_output
•	high_reasoning_required
•	cacheable
Example tasks:
•	generate_campaign_brief
•	generate_caption_batch
•	suggest_next_clip
•	summarize_weekly_performance
•	rewrite_synopsis
•	generate_region_specific_cta
 
AI settings screen
Add a dedicated AI settings area in the UI.
Sections
Provider connections
•	Claude credentials or workflow connector
•	OpenAI API key status
•	DeepSeek API key status
Provider priorities
•	default provider
•	fallback order
•	task-specific overrides
Usage controls
•	per-day token cap
•	per-user usage cap
•	project budget cap
•	warning thresholds
Prompt controls
•	master brand context
•	reusable title context blocks
•	prompt templates
•	cache settings
Manual fallback tools
•	copy prompt to clipboard
•	import response text
•	tag imported result source
 
OpenAI API setup
The app should support OpenAI as a configurable provider.
Setup requirements
•	create OpenAI API key in the OpenAI platform
•	store key securely on the server
•	never expose the key in browser code
•	use Bearer authentication
•	support model selection via environment variables or admin settings
OpenAI's official API docs say API keys should be kept secret and loaded securely on the server, using HTTP Bearer authentication. (platform.openai.com)
Example environment variables
OPENAI_API_KEY=your_openai_key
OPENAI_MODEL_PRIMARY=gpt-5
OPENAI_MODEL_FAST=gpt-4.1-mini
Note:
Available models can depend on account tier and verification status. (help.openai.com)
 
DeepSeek API setup
The app should support DeepSeek as a secondary or low-cost provider.
Setup requirements
•	create DeepSeek API key in the DeepSeek platform
•	store key securely on the server
•	use Bearer authentication
•	configure the DeepSeek base URL
DeepSeek's docs describe Bearer-auth access and an OpenAI-compatible API shape, with https://api.deepseek.com as the base URL and https://api.deepseek.com/v1 also supported for compatibility. (api-docs.deepseek.com)
Example environment variables
DEEPSEEK_API_KEY=your_deepseek_key
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL_PRIMARY=deepseek-chat
DEEPSEEK_MODEL_REASONING=deepseek-reasoner
 
Provider comparison mode
The app should optionally support running the same prompt against multiple providers.
Comparison view should show
•	provider
•	model
•	response preview
•	token usage
•	latency
•	human rating
•	selected winner
Use cases:
•	test which provider writes better horror copy
•	compare campaign hook quality
•	compare cost vs quality
 
AI safety and reliability rules
To keep output reliable across providers:
•	use structured prompts
•	require JSON schema where possible
•	run output validation
•	log failures per provider
•	allow human approval before publishing
•	store provider and model with every AI output
 
Recommended implementation pattern
At build time, create one ai_orchestrator module.
This module should:
•	route requests to Claude, OpenAI, or DeepSeek
•	apply prompt templates
•	handle retries and fallback
•	estimate usage
•	cache safe outputs
•	normalize responses into one internal format
This keeps the rest of the app provider-agnostic.

