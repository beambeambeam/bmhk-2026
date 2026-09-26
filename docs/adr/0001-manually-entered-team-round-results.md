# Store manually entered Team Round Results

Academic Operators enter a Team's current score and submission summary independently for each competition round. Store these supplied summaries as authoritative values rather than deriving them from individual submission records: this workflow relies on staff entry and does not supply a submission history. Later saves replace the current result atomically, so past values and individual submissions cannot be reconstructed from this table; a submission-event model would require a different data source and workflow.
