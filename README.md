# Hunter for ChatGPT

The Hunter app for ChatGPT connects ChatGPT to your Hunter account through the Model Context Protocol (MCP). Ask in plain language, and ChatGPT can find companies, count their contacts, verify email addresses, and enrich companies. It can also organize leads and lists, run email sequences, and push leads to your CRM.

This repository holds the MCP server behind the app. The app has a smaller tool set than the main Hunter MCP server, and it does not find email addresses for people.

- **App server:** `https://chatgpt.hunter.io/mcp`. The Hunter app connects to it for you.
- **Main Hunter MCP server:** `https://mcp.hunter.io/mcp` (Streamable HTTP). Other AI clients use it. Setup for each client is at [hunter.io/mcp](https://hunter.io/mcp).
- **Authentication:** OAuth
- **Plans:** every Hunter plan, including Free. The credits and limits of your plan apply.

## Use the Hunter app

1. Open the [Hunter app in the ChatGPT apps directory](https://chatgpt.com/plugins/plugin_asdk_app_6943c7d34d94819182a0b9acdc1ee952).
2. Click **Connect**.
3. Click **Sign in with Hunter**, then sign in to Hunter.
4. Review the permissions and click **Agree**.
5. Open a new chat. Type `@Hunter`, then your request.

For example: `@Hunter find 10 fintech companies in Berlin with 50 to 200 employees`.

Apps are available on every ChatGPT plan, including Free. On a Business or Enterprise plan, apps can be off until a workspace admin turns them on.

## Authentication

The app uses OAuth. You sign in on hunter.io, and ChatGPT never sees your Hunter password or your API key.

If you do not have a Hunter account, [sign up for free](https://hunter.io/users/sign_up).

To disconnect, open **Settings > Personalization > Apps** in ChatGPT. Select **Hunter**, then click **Disconnect**.

## Tools

ChatGPT picks the tools from your request. You do not call them by name.

The tables below list the tools in this repository. A new tool appears in ChatGPT only after OpenAI approves it, so the live app can show fewer tools for a period.

Data Platform plans have no Discover or Sequences tools. `Find-Similar-Companies` is not on the Free plan.

<!-- BEGIN GENERATED: mcp-tools:chatgpt. Generated from the Hunter MCP server; do not edit by hand. -->

The Data column says what a tool does:

- **Reads**: changes nothing in your account.
- **Paid lookup**: looks data up for credits and saves nothing.
- **Paid, saves leads**: looks data up for credits. If the team has automatic lead saving (on by default, off on Data Platform plans), it also saves the result as a lead.
- **Writes**: changes your account.
- **Irreversible**: makes a change that cannot be undone, such as deleting data, sending emails, or pushing leads to a CRM.

### Discover

Search Hunter's company database from criteria or from a seed company. Count the email addresses at each company. Save a search and run it again later.

Try: "Find fintech companies in France with 50 to 200 employees."

| Tool | Title | Credits | Data |
|---|---|---|---|
| `Count-Company-Emails` | Count Emails at Companies | Free | Reads |
| `Create-Saved-Search` | Create Saved Search | Free | Writes |
| `Delete-Saved-Search` | Delete Saved Search | Free | Irreversible |
| `Find-Companies` | Find Companies | Free | Reads |
| `Find-Similar-Companies` | Find Similar Companies | Free | Reads |
| `Get-Saved-Search` | Get Saved Search | Free | Reads |
| `List-Saved-Searches` | List Saved Searches | Free | Reads |

### Contact data

Check whether an email address is deliverable, and count the email addresses Hunter has for a domain.

Try: "How many email addresses does Hunter have for notion.com?"

| Tool | Title | Credits | Data |
|---|---|---|---|
| `Email-Count` | Email Count | Free | Reads |
| `Email-Verifier` | Verify Email | 0.5 credit | Paid, saves leads |

### Enrichment

Get profile data for a company from its domain.

Try: "Tell me about stripe.com."

| Tool | Title | Credits | Data |
|---|---|---|---|
| `Company-Enrichment` | Enrich Company | 0.2 credit, with at least 1 credit left to start | Paid lookup |

### Leads

Read, create, update, and delete leads. Find a lead by email address. Save a company to your account by its domain.

Try: "Save these contacts as leads without overwriting existing ones."

| Tool | Title | Credits | Data |
|---|---|---|---|
| `Create-Lead` | Create Lead | Free | Writes |
| `Create-Lead-If-Missing` | Create Lead if Missing | Free | Writes |
| `Create-Or-Update-Lead` | Create or Update Lead | Free | Irreversible |
| `Delete-Lead` | Delete Lead | Free | Irreversible |
| `Get-Lead` | Get Lead | Free | Reads |
| `Lead-Exists` | Check if Lead Exists | Free | Reads |
| `List-Leads` | List Leads | Free | Reads |
| `Save-Company` | Save Company | Free | Writes |
| `Update-Lead` | Update Lead | Free | Irreversible |

### Leads lists

Manage leads lists, merge two lists, mark favorites, and put lists in folders.

Try: "Create a leads list called Q4 Outreach and add these contacts to it."

| Tool | Title | Credits | Data |
|---|---|---|---|
| `Create-Leads-List` | Create Leads List | Free | Writes |
| `Create-Leads-List-Folder` | Create Leads List Folder | Free | Writes |
| `Delete-Leads-List` | Delete Leads List | Free | Irreversible |
| `Delete-Leads-List-Folder` | Delete Leads List Folder | Free | Irreversible |
| `Favorite-Leads-List` | Favorite Leads List | Free | Writes |
| `Get-Leads-List` | Get Leads List | Free | Reads |
| `List-Leads-List-Folders` | List Leads List Folders | Free | Reads |
| `List-Leads-Lists` | List Leads Lists | Free | Reads |
| `Merge-Leads-Lists` | Merge Leads Lists | Free | Irreversible |
| `Unfavorite-Leads-List` | Unfavorite Leads List | Free | Writes |
| `Update-Leads-List` | Update Leads List | Free | Irreversible |
| `Update-Leads-List-Folder` | Update Leads List Folder | Free | Irreversible |

### Tags and custom attributes

Manage lead tags and apply them to leads. Manage the custom attributes that leads can have.

Try: "Tag these leads as priority."

| Tool | Title | Credits | Data |
|---|---|---|---|
| `Add-Tag-To-Lead` | Add Tag to Lead | Free | Writes |
| `Create-Custom-Attribute` | Create Custom Attribute | Free | Writes |
| `Create-Lead-Tag` | Create Lead Tag | Free | Writes |
| `Delete-Custom-Attribute` | Delete Custom Attribute | Free | Irreversible |
| `Delete-Lead-Tag` | Delete Lead Tag | Free | Irreversible |
| `Get-Custom-Attribute` | Get Custom Attribute | Free | Reads |
| `List-Custom-Attributes` | List Custom Attributes | Free | Reads |
| `List-Lead-Tags` | List Lead Tags | Free | Reads |
| `Remove-Tag-From-Lead` | Remove Tag from Lead | Free | Writes |
| `Update-Custom-Attribute` | Update Custom Attribute | Free | Irreversible |
| `Update-Lead-Tag` | Update Lead Tag | Free | Irreversible |

### Company lists

Manage static and dynamic company lists, add and remove companies, mark favorites, and put lists in folders.

Try: "Save these companies to a Target Accounts list."

| Tool | Title | Credits | Data |
|---|---|---|---|
| `Add-Company-To-List` | Add Company to List | Free | Writes |
| `Create-Company-List` | Create Company List | Free | Writes |
| `Create-Company-List-Folder` | Create Company List Folder | Free | Writes |
| `Delete-Company-List` | Delete Company List | Free | Irreversible |
| `Delete-Company-List-Folder` | Delete Company List Folder | Free | Irreversible |
| `Favorite-Company-List` | Favorite Company List | Free | Writes |
| `Get-Company-List` | Get Company List | Free | Reads |
| `List-Company-List-Folders` | List Company List Folders | Free | Reads |
| `List-Company-Lists` | List Company Lists | Free | Reads |
| `Remove-Company-From-List` | Remove Company from List | Free | Writes |
| `Unfavorite-Company-List` | Unfavorite Company List | Free | Writes |
| `Update-Company-List` | Update Company List | Free | Irreversible |
| `Update-Company-List-Folder` | Update Company List Folder | Free | Irreversible |

### Bulk operations

Move, copy, or delete many leads or companies in one call.

Try: "Move every lead from the Q3 list to the Q4 list."

| Tool | Title | Credits | Data |
|---|---|---|---|
| `Bulk-Copy-Companies` | Bulk Copy Companies | Free | Irreversible |
| `Bulk-Delete-Companies` | Bulk Delete Companies | Free | Irreversible |
| `Bulk-Delete-Leads` | Bulk Delete Leads | Free | Irreversible |
| `Bulk-Move-Companies` | Bulk Move Companies | Free | Irreversible |
| `Bulk-Move-Leads` | Bulk Move Leads | Free | Irreversible |

### Sequences

Create and configure email outreach sequences. Start, pause, resume, and archive them. Get open, click, and reply statistics.

Try: "Create a 3-step sequence for my Q4 Outreach list, then start it."

| Tool | Title | Credits | Data |
|---|---|---|---|
| `Archive-Sequence` | Archive Sequence | Free | Irreversible |
| `Create-Sequence` | Create Sequence | Free | Writes |
| `Delete-Sequence` | Delete Sequence | Free | Irreversible |
| `Get-Sequence` | Get Sequence | Free | Reads |
| `Get-Sequence-Stats` | Get Sequence Stats | Free | Reads |
| `List-Sequences` | List Sequences | Free | Reads |
| `Pause-Sequence` | Pause Sequence | Free | Writes |
| `Resume-Sequence` | Resume Sequence | Free | Irreversible |
| `Start-Sequence` | Start Sequence | Free | Irreversible |
| `Update-Sequence` | Update Sequence | Free | Irreversible |

### Sequence steps and recipients

Write the email steps of a sequence, including A/B test variants. Add recipients to a sequence and remove them.

Try: "Add a follow-up email 3 days after the first one."

| Tool | Title | Credits | Data |
|---|---|---|---|
| `Add-Sequence-Recipients` | Add Sequence Recipients | Free | Irreversible |
| `Create-Sequence-Follow-Up` | Create Sequence Follow-Up | Free | Writes |
| `Delete-Sequence-Follow-Up` | Delete Sequence Follow-Up | Free | Irreversible |
| `Get-Sequence-Follow-Up` | Get Sequence Follow-Up | Free | Reads |
| `List-Sequence-Follow-Ups` | List Sequence Follow-Ups | Free | Reads |
| `List-Sequence-Recipients` | List Sequence Recipients | Free | Reads |
| `Remove-Sequence-Recipients` | Remove Sequence Recipients | Free | Irreversible |
| `Update-Sequence-Follow-Up` | Update Sequence Follow-Up | Free | Irreversible |

### Message templates

Manage reusable email templates.

Try: "Save this email as a reusable template."

| Tool | Title | Credits | Data |
|---|---|---|---|
| `Create-Message-Template` | Create Message Template | Free | Writes |
| `Delete-Message-Template` | Delete Message Template | Free | Irreversible |
| `Get-Message-Template` | Get Message Template | Free | Reads |
| `List-Message-Templates` | List Message Templates | Free | Reads |
| `Update-Message-Template` | Update Message Template | Free | Irreversible |

### Email accounts

Read the sending inboxes connected to Hunter and the sequences that each inbox sends.

Try: "Which of my inboxes can send sequences?"

| Tool | Title | Credits | Data |
|---|---|---|---|
| `Get-Email-Account` | Get Email Account | Free | Reads |
| `List-Email-Account-Sequences` | List Sequences for Email Account | Free | Reads |
| `List-Email-Accounts` | List Email Accounts | Free | Reads |

### Integrations

Read connected apps and their field mappings. Push leads to a connected CRM. Read and update webhooks.

Try: "Push my Q4 Outreach list to HubSpot."

| Tool | Title | Credits | Data |
|---|---|---|---|
| `Get-Connected-App` | Get Connected App | Free | Reads |
| `List-Connected-Apps` | List Connected Apps | Free | Reads |
| `List-Webhooks` | List Webhooks | Free | Reads |
| `Push-Leads-To-CRM` | Push Leads to CRM | Free | Irreversible |
| `Update-Webhook` | Update Webhook | Free | Irreversible |

### Briefing and signals

Say what is new in the account: signal events, this week's opportunities, and credits. Read the events, the opportunities and their people or companies, and the Monitored Signals.

Try: "What is new in my Hunter account this week?"

| Tool | Title | Credits | Data |
|---|---|---|---|
| `Get-Briefing` | Get Briefing | Free | Reads |
| `Get-Opportunity-Results` | Get Opportunity Results | Free | Reads |
| `List-Monitored-Signals` | List Monitored Signals | Free | Reads |
| `List-Opportunities` | List Opportunities | Free | Reads |
| `List-Signals` | List Signals | Free | Reads |

### Account and API keys

Read the plan, team, and credit usage.

Try: "How many credits do I have left?"

| Tool | Title | Credits | Data |
|---|---|---|---|
| `Get-Account-Details` | Get Account Details | Free | Reads |
| `Get-Usage` | Get Quota Usage | Free | Reads |

### Planning and feedback

Report a problem with the API or the tools to Hunter.

Try: "Report that this search returned no results."

| Tool | Title | Credits | Data |
|---|---|---|---|
| `Report-API-Feedback` | Report API Feedback | Free | Writes |

<!-- END GENERATED: mcp-tools:chatgpt -->

## Credits

The Hunter app uses the same credits as the Hunter web app and API. The Free plan includes 50 credits a month.

<!-- BEGIN GENERATED: mcp-credits:chatgpt. Generated from the Hunter MCP server; do not edit by hand. -->

| Tool | Plans with one credit pool | Older plans with separate searches and verifications | Charged when |
|---|---|---|---|
| `Company-Enrichment` | 0.2 credit, with at least 1 credit left to start | 1 search | Data is found |
| `Email-Verifier` | 0.5 credit | 1 verification | The result is valid, invalid or accept_all |

Every other tool is free.

<!-- END GENERATED: mcp-credits:chatgpt -->

## Troubleshooting

- **ChatGPT finds no MCP server.** If you added Hunter by hand with a URL, the URL is usually a hunter.io page address, such as `https://hunter.io/api-documentation`. Remove that entry. Then install the Hunter app from the ChatGPT apps directory.
- **Hunter does not answer.** Start a new chat. Type `@Hunter` before your request, and make sure that Hunter shows under the chat box.
- **The results come from the wrong Hunter account.** Disconnect the app. Then connect it again and sign in with the correct account.

## Links

- [Hunter for ChatGPT](https://hunter.io/chatgpt-app)
- [Step-by-step setup guide](https://help.hunter.io/en/articles/15702684-how-to-connect-hunter-to-chatgpt)
- [Hunter MCP setup for every client](https://hunter.io/mcp)
- [Hunter MCP developer reference](https://hunter.io/api-documentation/v2#mcp)
- [Support](https://hunter.io/contact)

## Development

### Launch the MCP server

```bash
npx wrangler dev
```

This command starts the MCP server locally.

### Launch the MCP Inspector

```bash
npx @modelcontextprotocol/inspector
```

This command starts the MCP Inspector, a tool to debug and test the server.
