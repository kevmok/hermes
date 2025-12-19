# Moon Dev AI Agents Repository Research

**Research Date:** 2025-12-18
**Repository:** https://github.com/moondevonyt/moon-dev-ai-agents

---

## Executive Summary

This document provides a comprehensive analysis of the moon-dev-ai-agents repository, focusing on:
1. CSV file structure and schemas used in the Polymarket prediction system
2. The SwarmAgent implementation for multi-model AI consensus
3. Integration patterns between the swarm system and Polymarket agents

---

## 1. CSV File Structure in Polymarket Data

**Location:** `src/data/polymarket/`

### CSV Files Overview

The Polymarket system maintains three primary CSV files plus backup copies:

1. **markets.csv** - Core market tracking database
2. **predictions.csv** - AI model prediction history
3. **consensus_picks.csv** - High-confidence consensus recommendations
4. Backup files (.csv.backup) for data recovery

---

### 1.1 markets.csv Schema

**Purpose:** Tracks all Polymarket markets discovered via WebSocket trades

**Columns:**
```
timestamp               (Unix timestamp)
market_id              (Hex address, e.g., 0x34c989ba...)
event_slug             (URL-friendly identifier, e.g., "presidential-election-winner-2028")
title                  (Human-readable question)
outcome                (YES/NO - the outcome being tracked)
price                  (Decimal 0.0-1.0, represents probability)
size_usd               (Trade volume in USD)
first_seen             (ISO timestamp when first detected)
last_analyzed          (ISO timestamp of most recent AI analysis)
last_trade_timestamp   (When last trade activity occurred)
```

**Example Row:**
```
1761290123,,presidential-election-winner-2028,Will Vivek Ramaswamy win the 2028 US Presidential Election?,Yes,0.013,1223.85,2025-10-24T08:10:49,,
```

**Update Pattern:**
- New markets: Inserted when WebSocket detects qualifying trades
- Existing markets: Price and timestamp fields updated on new trades
- Analysis tracking: `last_analyzed` field updated after AI processing

**Thread Safety:** All write operations protected by `threading.Lock()`

---

### 1.2 predictions.csv Schema

**Purpose:** Historical record of all AI model predictions per market

**Columns:**
```
analysis_timestamp      (ISO timestamp of analysis run)
analysis_run_id        (Unique run identifier, e.g., "20251024_104438")
market_title           (The prediction question)
market_slug            (Event identifier)
claude_prediction      (YES/NO/NO_TRADE)
opus_prediction        (YES/NO/NO_TRADE or empty)
openai_prediction      (YES/NO/NO_TRADE)
groq_prediction        (YES/NO/NO_TRADE or empty)
gemini_prediction      (YES/NO/NO_TRADE or empty)
deepseek_prediction    (YES/NO/NO_TRADE)
xai_prediction         (YES/NO/NO_TRADE)
ollama_prediction      (YES/NO/NO_TRADE or empty)
consensus_prediction   (Result + percentage confidence)
num_models_responded   (Integer count, typically 4-7)
market_link           (Polymarket URL)
web_search_used       (Boolean flag - present in websearch variant)
```

**Example Pattern:**
```
analysis_timestamp: 2025-10-24T10:44:38.196800
analysis_run_id: 20251024_104438
market_title: Will Vivek Ramaswamy win the 2028 US Presidential Election?
claude_prediction: NO
openai_prediction: NO
deepseek_prediction: NO
xai_prediction: NO
consensus_prediction: NO (100% - 4/4 models agree)
num_models_responded: 4
```

**Data Flow:**
1. SwarmAgent returns responses from multiple models
2. `_save_swarm_predictions()` parses individual model outputs
3. Extracts YES/NO/NO_TRADE decisions using regex/text parsing
4. Calculates consensus vote tallies and percentages
5. Appends row to predictions.csv

---

### 1.3 consensus_picks.csv Schema

**Purpose:** Ranked list of highest-confidence predictions for actionable trading

**Columns:**
```
timestamp           (ISO timestamp)
run_id             (Analysis run identifier)
rank               (1-N ranking by consensus strength)
market_number      (Market position in batch)
market_title       (The prediction question)
side               (YES or NO position recommendation)
consensus          (Agreement description, e.g., "4 out of 4 models agreed")
consensus_count    (Number of models in agreement)
total_models       (Total models that responded)
reasoning          (Natural language justification)
web_search_used    (Boolean - in websearch variant)
link              (Polymarket URL)
```

**Example Row:**
```
timestamp: 2025-11-06T10:41:35.330746
run_id: 20251106_104135
rank: 1
market_number: 3
market_title: US x Venezuela military engagement by November 14?
side: NO
consensus: 4 out of 4 models agreed
consensus_count: 4
total_models: 4
reasoning: All models agree that direct US-Venezuela military engagement is extremely unlikely given current diplomatic relations and lack of escalation indicators.
link: https://polymarket.com/event/us-x-venezuela-military-engagement-by-october-31
```

**Usage Pattern:**
- Generated after full batch analysis completes
- Only includes markets meeting minimum consensus threshold
- Ranked by agreement strength and confidence level
- Used for decision-making and trade execution

---

## 2. SwarmAgent Implementation

**Location:** `src/agents/swarm_agent.py`

### 2.1 Architecture Overview

The SwarmAgent implements a parallel multi-model AI consensus system with the following design:

**Core Concept:** Query multiple AI models simultaneously, collect individual responses, and generate an AI-synthesized consensus summary.

**Key Features:**
- Parallel execution using ThreadPoolExecutor
- Timeout management (120s per model)
- Thread-safe operations
- Automatic response cleanup (strips `<think>` tags)
- Numbered AI mapping for easy reference (AI #1, AI #2, etc.)
- Results persistence to JSON files
- DataFrame export capability

---

### 2.2 Configuration

**Active Models (as of research date):**

```python
SWARM_MODELS = {
    'deepseek': (True, 'deepseek', 'deepseek-chat'),
    'xai': (True, 'xai', 'grok-beta'),
    'qwen_openrouter': (True, 'openrouter', 'qwen/qwen-2.5-72b-instruct'),
    'claude': (True, 'anthropic', 'claude-sonnet-4-20250514'),
    'opus': (True, 'anthropic', 'claude-opus-4-20250514'),
    'openai': (True, 'openrouter', 'openai/gpt-4.5-mini'),
}
```

**Model Parameters:**
```python
DEFAULT_TEMPERATURE = 0.7
DEFAULT_MAX_TOKENS = 2048
MODEL_TIMEOUT = 120  # seconds
```

**Consensus Reviewer:**
```python
CONSENSUS_REVIEWER_MODEL = ('deepseek', 'deepseek-chat')
```

---

### 2.3 Core Methods

#### `__init__()`

**Purpose:** Initialize the swarm with enabled models

**Implementation:**
```python
def __init__(self):
    self.active_models = {}
    self._initialize_models()
    self.results_dir = Path(project_root) / "src/data/swarm_agent"
    self.results_dir.mkdir(parents=True, exist_ok=True)
```

**Responsibilities:**
- Load models from configuration
- Create results directory
- Display initialization status with model count

---

#### `_initialize_models()`

**Purpose:** Load model instances from factory

**Flow:**
1. Iterate through SWARM_MODELS configuration
2. For each enabled model, call `model_factory.get_model()`
3. Store successful instances in `self.active_models` dict
4. Handle errors gracefully (skips failed models)

---

#### `query(prompt, system_prompt=None)`

**Purpose:** Main entry point for parallel model queries

**Signature:**
```python
def query(self, prompt: str, system_prompt: Optional[str] = None) -> Dict[str, Any]
```

**Implementation Flow:**

1. **Parallel Submission Phase:**
```python
with ThreadPoolExecutor(max_workers=len(self.active_models)) as executor:
    futures = {
        executor.submit(
            self._query_single_model,
            provider,
            model_info,
            prompt,
            system_prompt
        ): provider
        for provider, model_info in self.active_models.items()
    }
```

2. **Collection Phase:**
```python
for future in as_completed(futures, timeout=MODEL_TIMEOUT + 10):
    provider = futures[future]
    try:
        provider, response = future.result(timeout=5)
        all_responses[provider] = response
    except TimeoutError:
        all_responses[provider] = {
            "provider": provider,
            "success": False,
            "error": f"Timeout after {MODEL_TIMEOUT}s"
        }
```

3. **Post-Processing:**
- Strip `<think>` tags from responses
- Generate consensus summary
- Calculate statistics (success rate, total time)

**Return Structure:**
```python
{
    'responses': {
        'claude': {
            'provider': 'claude',
            'model': 'claude-sonnet-4-20250514',
            'response': '...',
            'success': True,
            'response_time': 2.34
        },
        # ... other models
    },
    'consensus_summary': '...',
    'model_mapping': {
        'AI #1': 'CLAUDE',
        'AI #2': 'OPENAI',
        # ...
    },
    'metadata': {
        'total_models': 6,
        'successful': 5,
        'failed': 1,
        'total_time': 5.67
    }
}
```

---

#### `_query_single_model(provider, model_info, prompt, system_prompt)`

**Purpose:** Execute a single model query with timing

**Implementation:**
```python
def _query_single_model(self, provider: str, model_info: Dict,
                       prompt: str, system_prompt: Optional[str] = None
                       ) -> Tuple[str, Dict]:
    start_time = time.time()

    try:
        if system_prompt is None:
            system_prompt = "You are a helpful AI assistant providing thoughtful analysis."

        response = model_info["model"].generate_response(
            system_prompt=system_prompt,
            user_content=prompt,
            temperature=DEFAULT_TEMPERATURE,
            max_tokens=DEFAULT_MAX_TOKENS
        )

        elapsed = time.time() - start_time

        return provider, {
            "provider": provider,
            "model": model_info["name"],
            "response": response,
            "success": True,
            "response_time": round(elapsed, 2)
        }
    except Exception as e:
        return provider, {
            "provider": provider,
            "success": False,
            "error": str(e),
            "response_time": round(time.time() - start_time, 2)
        }
```

**Key Features:**
- Timing measurement for performance tracking
- Standardized error handling
- Default system prompt if not provided
- Returns tuple (provider_name, response_dict)

---

#### `_generate_consensus_review(responses, original_prompt)`

**Purpose:** Synthesize individual responses into a consensus summary

**Implementation Flow:**

1. **Filter Successful Responses:**
```python
successful_responses = [
    (provider, r["response"])
    for provider, r in responses.items()
    if r["success"] and r["response"]
]
```

2. **Build Model Mapping:**
```python
model_mapping = {}
formatted_responses = []

for i, (provider, response) in enumerate(successful_responses, 1):
    model_mapping[f"AI #{i}"] = provider.upper()

    response_text = self._strip_think_tags(str(response))
    formatted_responses.append(f"AI #{i}:\n{response_text}\n")
```

3. **Generate Consensus:**
```python
reviewer_model = model_factory.get_model(model_type, model_name)

review_response = reviewer_model.generate_response(
    system_prompt="You are a consensus analyzer. Provide clear, concise 3-sentence summaries.",
    user_content=f"Original Question: {original_prompt}\n\n" + "\n".join(formatted_responses),
    temperature=0.3,
    max_tokens=200
)

consensus_summary = review_response.content.strip()
return consensus_summary, model_mapping
```

**Key Design Decisions:**
- Consensus limited to 3 sentences for conciseness
- Lower temperature (0.3) for more deterministic summaries
- Numbered AI labels (AI #1, AI #2) for easy reference
- Original prompt included for context

---

#### `_strip_think_tags(text)`

**Purpose:** Remove reasoning tags from model responses

**Implementation:**
```python
def _strip_think_tags(self, text: str) -> str:
    """Remove <think>...</think> tags from responses"""
    return re.sub(r'<think>.*?</think>', '', text, flags=re.DOTALL).strip()
```

**Rationale:** Some models (like DeepSeek) output reasoning in XML tags which should be hidden from end users.

---

### 2.4 Utility Methods

#### `_save_results(results, prompt)`

**Purpose:** Persist results to JSON files for debugging and analysis

**File Structure:**
```
src/data/swarm_agent/
  swarm_results_20251218_143022.json
  swarm_results_20251218_143155.json
  ...
```

#### `query_dataframe(prompt, system_prompt=None)`

**Purpose:** Return results as pandas DataFrame for data analysis

**Schema:**
```python
columns=['Provider', 'Model', 'Success', 'Response', 'Response_Time']
```

#### `_print_summary(results)`

**Purpose:** Display formatted terminal output with colors

**Output Format:**
```
=== SWARM QUERY RESULTS ===
Model Key:
  AI #1 = CLAUDE
  AI #2 = OPENAI
  ...

--- AI #1 (CLAUDE) - 2.3s ---
[Response text]

--- AI #2 (OPENAI) - 1.8s ---
[Response text]

=== CONSENSUS SUMMARY ===
[3-sentence synthesis]

=== STATISTICS ===
Total Models: 6
Successful: 5
Failed: 1
Total Time: 5.67s
```

---

### 2.5 Parallel Execution Design

**ThreadPoolExecutor Pattern:**

1. **Submission Phase:**
   - All models queued simultaneously
   - Each gets independent thread
   - No blocking until collection

2. **Concurrent Execution:**
   - Models query APIs in parallel
   - Independent timeout per model (120s)
   - Failures isolated (don't affect other models)

3. **Collection Phase:**
   - `as_completed()` yields results as they finish
   - Fast models return first
   - Slow models don't block display of early results

4. **Timeout Handling:**
   - Individual result timeout: 5 seconds
   - Global executor timeout: 130 seconds (MODEL_TIMEOUT + 10)
   - Timed-out models marked as failed with error message

**Advantages:**
- Total time = slowest model, not sum of all models
- Early results available immediately
- Resilient to individual model failures
- Efficient use of I/O-bound waiting time

---

## 3. Integration: Polymarket Agent Uses SwarmAgent

**Location:** `src/agents/polymarket_agent.py` and `polymarket_websearch_agent.py`

### 3.1 Initialization

**Agent Setup:**
```python
if USE_SWARM_MODE:
    cprint("🤖 Using SWARM MODE - Multiple AI models", "green")
    try:
        from src.agents.swarm_agent import SwarmAgent
        self.swarm = SwarmAgent()
    except Exception as e:
        cprint(f"❌ Failed to initialize SwarmAgent: {e}", "red")
        # Fall back to single model
```

---

### 3.2 Analysis Workflow

#### Market Selection

**Eligibility Criteria (checked every 300 seconds):**
- Markets with no prior analysis (`last_analyzed` is empty)
- Markets with recent trades since last analysis
- Markets exceeding reanalysis window (8 hours default)

**Batch Preparation:**
```python
markets_to_analyze = self.markets_df.tail(MARKETS_TO_ANALYZE)
```

---

#### Prompt Construction

**System Prompt:**
- Instructions for prediction format (YES/NO/NO_TRADE)
- Market analysis guidelines
- Output format requirements

**User Prompt:**
- Market details (title, price, volume)
- Optional web search context (in websearch variant)
- Batch of multiple markets for efficiency

---

#### SwarmAgent Query

**Execution:**
```python
swarm_result = self.swarm.query(
    prompt=user_prompt,
    system_prompt=system_prompt
)
```

**Response Structure:**
```python
swarm_result = {
    'responses': {
        'claude': {'success': True, 'response': '...', 'response_time': 2.3},
        'openai': {'success': True, 'response': '...', 'response_time': 1.8},
        # ...
    },
    'consensus_summary': '...',
    'model_mapping': {'AI #1': 'CLAUDE', 'AI #2': 'OPENAI', ...},
    'metadata': {...}
}
```

---

### 3.3 Response Processing

#### Display Individual Predictions

**Terminal Output:**
```python
for model_name, model_data in swarm_result.get('responses', {}).items():
    if model_data.get('success'):
        response_time = model_data.get('response_time', 0)
        cprint(f"✅ {model_name.upper()} ({response_time:.1f}s)", "cyan")
        cprint(model_data.get('response', 'No response'), "white")
```

---

#### Parse Predictions

**Extraction Logic (`_save_swarm_predictions` method):**

1. **Initialize Prediction Dict:**
```python
predictions = {
    'claude_prediction': '',
    'opus_prediction': '',
    'openai_prediction': '',
    # ... for all models
}
```

2. **Parse Each Model Response:**
```python
for model_name, model_data in responses.items():
    if not model_data.get('success'):
        continue

    response_text = str(model_data.get('response', ''))

    # Extract YES/NO/NO_TRADE using regex or text search
    # Map model_name to prediction column
    # Store in predictions dict
```

3. **Calculate Consensus:**
```python
yes_votes = sum(1 for pred in predictions.values() if 'YES' in pred)
no_votes = sum(1 for pred in predictions.values() if 'NO' in pred)
total_votes = yes_votes + no_votes

if total_votes > 0:
    majority = 'YES' if yes_votes > no_votes else 'NO'
    percentage = max(yes_votes, no_votes) / total_votes * 100
    consensus = f"{majority} ({percentage:.0f}% - {max(yes_votes, no_votes)}/{total_votes} models)"
```

---

#### Save to CSV

**Predictions CSV Update:**
```python
new_row = {
    'analysis_timestamp': datetime.now().isoformat(),
    'analysis_run_id': run_id,
    'market_title': market_title,
    'market_slug': market_slug,
    **predictions,  # All model predictions
    'consensus_prediction': consensus,
    'num_models_responded': num_responded,
    'market_link': market_url
}

self.predictions_df = pd.concat([
    self.predictions_df,
    pd.DataFrame([new_row])
], ignore_index=True)

self._save_predictions()
```

---

#### Generate Consensus Picks

**High-Confidence Extraction:**

1. **Filter Markets:** Only include those meeting consensus threshold (e.g., 75%+ agreement)

2. **Rank by Confidence:** Sort by consensus percentage and model count

3. **Generate Reasoning:** Use SwarmAgent consensus summary or additional AI call

4. **Save to Consensus CSV:**
```python
consensus_row = {
    'timestamp': datetime.now().isoformat(),
    'run_id': run_id,
    'rank': rank,
    'market_number': market_num,
    'market_title': title,
    'side': side,  # YES or NO
    'consensus': consensus_text,
    'consensus_count': agreed_count,
    'total_models': total_models,
    'reasoning': reasoning_text,
    'link': market_url
}

# Append to CSV (note: append mode, not replace)
consensus_df = pd.concat([
    self.consensus_picks_df,
    pd.DataFrame([consensus_row])
], ignore_index=True)

self._save_consensus_picks_to_csv()
```

---

### 3.4 Web Search Enhancement (websearch variant)

**Additional Feature in polymarket_websearch_agent.py:**

1. **Pre-Query Research:**
```python
search_context = self.search_market_context(market_title)
```

2. **Enhanced Prompt:**
```python
prompt_with_context = f"""
Market: {market_title}

Web Search Results:
{search_context}

Please analyze...
"""
```

3. **Search Logging:**
- Tracks which markets used web search
- Adds `web_search_used` column to CSV files
- Logs search queries and results

---

## 4. Implementation Patterns and Best Practices

### 4.1 Thread Safety

**Pattern:** All CSV operations protected by lock
```python
import threading

self.csv_lock = threading.Lock()

def _save_markets(self):
    try:
        with self.csv_lock:
            self.markets_df.to_csv(MARKETS_CSV, index=False)
    except Exception as e:
        cprint(f"❌ Error saving CSV: {e}", "red")
```

**Rationale:** Multiple threads (WebSocket, status display, analysis) access CSVs concurrently.

---

### 4.2 Graceful Degradation

**Pattern:** Fall back to single model if SwarmAgent fails
```python
try:
    from src.agents.swarm_agent import SwarmAgent
    self.swarm = SwarmAgent()
except Exception as e:
    cprint(f"❌ Failed to initialize SwarmAgent: {e}", "red")
    self.swarm = None
    # Use single model fallback
```

**Rationale:** System remains operational even if multi-model setup fails.

---

### 4.3 Incremental Updates

**Pattern:** Append-only for historical data
```python
# predictions.csv and consensus_picks.csv use append pattern
new_df = pd.concat([existing_df, new_rows], ignore_index=True)
```

**markets.csv uses update pattern:**
```python
existing_row_idx = markets_df[markets_df['event_slug'] == slug].index
if len(existing_row_idx) > 0:
    markets_df.loc[existing_row_idx, 'price'] = new_price
    markets_df.loc[existing_row_idx, 'timestamp'] = new_timestamp
else:
    markets_df = pd.concat([markets_df, new_row], ignore_index=True)
```

---

### 4.4 Batch Processing

**Pattern:** Analyze multiple markets in single SwarmAgent call
```python
# Instead of N API calls (one per market):
for market in markets:
    result = swarm.query(market_prompt)

# Use single batch call:
batch_prompt = "\n\n".join([
    f"Market {i+1}: {market['title']}"
    for i, market in enumerate(markets)
])
result = swarm.query(batch_prompt)
```

**Benefits:**
- Reduces total API calls
- Faster overall execution
- More consistent context across markets

---

### 4.5 Error Handling

**Pattern:** Individual model failures don't block others
```python
try:
    provider, response = future.result(timeout=5)
    all_responses[provider] = response
except TimeoutError:
    all_responses[provider] = {
        "success": False,
        "error": f"Timeout after {MODEL_TIMEOUT}s"
    }
except Exception as e:
    all_responses[provider] = {
        "success": False,
        "error": str(e)
    }
```

**Rationale:** Maximize successful responses even when some models fail.

---

## 5. Key Insights and Takeaways

### 5.1 SwarmAgent Design Philosophy

**Strengths:**
1. **Parallel Efficiency:** Total time ≈ slowest model, not sum
2. **Fault Tolerance:** Individual failures isolated
3. **Model Agnostic:** Easy to add/remove models via configuration
4. **Transparency:** Numbered AI labels for traceability
5. **Consensus Quality:** AI-generated summary more nuanced than simple voting

**Trade-offs:**
- Increased API costs (multiple model calls per query)
- Complexity in result parsing (need to extract structured data from free text)
- Potential for consensus degradation if models disagree significantly

---

### 5.2 CSV Data Architecture

**Design Decisions:**
1. **Flat File Storage:** Simple, portable, human-readable
2. **Timestamp Tracking:** Enables temporal analysis and reanalysis logic
3. **Append-Only History:** Preserves full prediction trail
4. **Denormalized Structure:** Market info repeated in predictions for self-contained rows

**Scalability Considerations:**
- CSVs grow indefinitely (may need archival strategy)
- Full file read/write on every save (inefficient for large datasets)
- No indexing (linear search for market lookups)

**Recommended Improvements for Scale:**
- Migrate to SQLite or PostgreSQL for indexing
- Implement pagination/windowing for large datasets
- Add data retention policies

---

### 5.3 Polymarket Integration Patterns

**Event-Driven Architecture:**
```
WebSocket Trades → Market Detection → Eligibility Check → Batch Analysis → CSV Updates
```

**Analysis Triggers:**
1. Time-based: Every 300 seconds
2. Event-based: New markets detected
3. Condition-based: Reanalysis window expired

**Data Flow:**
```
Live Markets (WebSocket)
  ↓
markets.csv (tracking)
  ↓
Analysis Eligibility Filter
  ↓
SwarmAgent Batch Query
  ↓
Response Parsing
  ↓
predictions.csv (history)
  ↓
Consensus Calculation
  ↓
consensus_picks.csv (actionable)
```

---

## 6. Code Examples for Implementation

### 6.1 Basic SwarmAgent Usage

```python
from src.agents.swarm_agent import SwarmAgent

# Initialize
swarm = SwarmAgent()

# Query
result = swarm.query(
    prompt="Will Bitcoin reach $100k by end of 2025?",
    system_prompt="You are a cryptocurrency analyst. Provide YES/NO with reasoning."
)

# Access results
for model_name, model_data in result['responses'].items():
    if model_data['success']:
        print(f"{model_name}: {model_data['response']}")

print(f"\nConsensus: {result['consensus_summary']}")
print(f"\nModel Mapping: {result['model_mapping']}")
```

---

### 6.2 CSV Integration Pattern

```python
import pandas as pd
from datetime import datetime

# Load existing data
markets_df = pd.read_csv('markets.csv')

# Query SwarmAgent
swarm_result = swarm.query(prompt=market_analysis_prompt)

# Parse responses
predictions = {}
for model_name, model_data in swarm_result['responses'].items():
    if model_data['success']:
        response_text = model_data['response']
        # Extract YES/NO/NO_TRADE
        prediction = 'YES' if 'YES' in response_text else 'NO' if 'NO' in response_text else 'NO_TRADE'
        predictions[f'{model_name}_prediction'] = prediction

# Calculate consensus
yes_count = sum(1 for p in predictions.values() if p == 'YES')
no_count = sum(1 for p in predictions.values() if p == 'NO')
total = yes_count + no_count

if total > 0:
    majority = 'YES' if yes_count > no_count else 'NO'
    percentage = max(yes_count, no_count) / total * 100
    consensus = f"{majority} ({percentage:.0f}% - {max(yes_count, no_count)}/{total})"
else:
    consensus = 'NO_CONSENSUS'

# Save to predictions CSV
new_row = {
    'analysis_timestamp': datetime.now().isoformat(),
    'analysis_run_id': datetime.now().strftime('%Y%m%d_%H%M%S'),
    'market_title': market_title,
    **predictions,
    'consensus_prediction': consensus,
    'num_models_responded': len(predictions)
}

predictions_df = pd.concat([
    predictions_df,
    pd.DataFrame([new_row])
], ignore_index=True)

predictions_df.to_csv('predictions.csv', index=False)
```

---

### 6.3 Parallel Batch Processing

```python
# Instead of sequential:
for market in markets:
    result = swarm.query(f"Analyze: {market['title']}")
    # Process result

# Use batch processing:
batch_prompt = "\n\n".join([
    f"Market {i+1}: {m['title']} (Current price: {m['price']}, Volume: ${m['size_usd']})"
    for i, m in enumerate(markets)
])

batch_prompt += "\n\nFor each market, provide:\n1. Prediction (YES/NO/NO_TRADE)\n2. Confidence level\n3. Brief reasoning"

result = swarm.query(batch_prompt)

# Parse batch response
# (Implementation depends on response format)
```

---

## 7. Files and Code References

### Primary Source Files

1. **SwarmAgent Implementation:**
   - `src/agents/swarm_agent.py`
   - Complete parallel multi-model system

2. **Polymarket Integration:**
   - `src/agents/polymarket_agent.py`
   - Base implementation with SwarmAgent integration
   - `src/agents/polymarket_websearch_agent.py`
   - Enhanced variant with web search

3. **Data Files:**
   - `src/data/polymarket/markets.csv`
   - `src/data/polymarket/predictions.csv`
   - `src/data/polymarket/consensus_picks.csv`

4. **Results:**
   - `src/data/swarm_agent/swarm_results_*.json`
   - Individual query results with full response data

---

## 8. Recommended Next Steps

### For Implementation

1. **Adapt SwarmAgent for Your Use Case:**
   - Modify `SWARM_MODELS` configuration for available APIs
   - Adjust temperature and max_tokens for domain
   - Customize consensus reviewer model

2. **Design CSV Schema:**
   - Define columns for your prediction domain
   - Include timestamp tracking for temporal analysis
   - Add metadata columns for filtering and analysis

3. **Build Integration Layer:**
   - Create agent that uses SwarmAgent
   - Implement response parsing for your format
   - Build CSV update logic with thread safety

4. **Add Monitoring:**
   - Track model response times
   - Monitor success/failure rates
   - Log consensus agreement levels

### For Optimization

1. **Response Parsing:**
   - Use structured output formats (JSON) instead of free text
   - Implement stricter prompt engineering for consistent format
   - Add validation for extracted predictions

2. **Database Migration:**
   - Move from CSV to SQLite for better performance
   - Add indexes for common query patterns
   - Implement proper foreign keys and relationships

3. **Consensus Algorithm:**
   - Experiment with weighted voting (based on model performance)
   - Implement confidence scoring beyond simple majority
   - Add uncertainty quantification

4. **Cost Optimization:**
   - Implement model tiering (fast/cheap models first, expensive for tie-breaking)
   - Add caching for similar queries
   - Batch more aggressively to reduce API calls

---

## 9. Conclusion

The moon-dev-ai-agents repository demonstrates a production-grade implementation of multi-model AI consensus for prediction markets. Key strengths include:

- **Robust parallel execution** with proper timeout and error handling
- **Simple but effective CSV-based data persistence** for tracking and analysis
- **Clear separation of concerns** between data collection (WebSocket), analysis (SwarmAgent), and storage (CSV)
- **Transparent model attribution** through numbered AI labels
- **Graceful degradation** with fallback mechanisms

The SwarmAgent architecture is particularly well-suited for:
- Binary prediction tasks (YES/NO decisions)
- Scenarios where consensus improves accuracy
- Use cases requiring transparency in model responses
- Applications needing resilience to individual model failures

The CSV data structure, while simple, effectively captures:
- Market lifecycle (first_seen → last_analyzed → consensus)
- Complete prediction history with model-level granularity
- Actionable insights through consensus picks

This research provides a comprehensive foundation for implementing similar multi-model consensus systems with structured data persistence.

---

**End of Research Document**
