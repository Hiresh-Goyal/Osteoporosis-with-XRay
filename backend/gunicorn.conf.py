# Gunicorn Configuration for Render Free Tier (Memory Optimization)

# We use exactly 1 worker to prevent multiple processes from cloning the ML models 
# and blowing past the 512MB RAM limit.
workers = 1

# We use threads instead of multiple workers to handle concurrency
threads = 4

# Do not preload the application before worker processes are forked.
# This saves memory by avoiding duplication of the base app footprint.
preload_app = False

# Timeout for workers (important for deep learning inference which might take a few seconds)
timeout = 120

# Max requests before a worker restarts (helps clear out memory leaks over time)
max_requests = 50
max_requests_jitter = 10
