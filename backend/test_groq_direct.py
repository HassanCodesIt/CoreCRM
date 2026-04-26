import os
from groq import Groq

# Use the key provided by the user
api_key = "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"
client = Groq(api_key=api_key)

try:
    print("Testing llama3-70b-8192...")
    completion = client.chat.completions.create(
        model="llama3-70b-8192",
        messages=[{"role": "user", "content": "Hello"}],
    )
    print(f"Success: {completion.choices[0].message.content}")
except Exception as e:
    print(f"FAILED llama3-70b-8192: {str(e)}")

try:
    # Testing the model name the user suggested in the prompt (maybe they know something)
    # openai/gpt-oss-120b
    print("\nTesting openai/gpt-oss-120b...")
    completion = client.chat.completions.create(
        model="openai/gpt-oss-120b",
        messages=[{"role": "user", "content": "Hello"}],
    )
    print(f"Success: {completion.choices[0].message.content}")
except Exception as e:
    print(f"FAILED openai/gpt-oss-120b: {str(e)}")
