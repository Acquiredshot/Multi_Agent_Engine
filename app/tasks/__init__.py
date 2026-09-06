"""Celery tasks, one module per agent.

Importing this package does not import the task modules; the worker and the
API both reach them via ``celery_app``'s ``include`` list.
"""
