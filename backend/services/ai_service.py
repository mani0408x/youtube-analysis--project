import random
import time

def generate_video_ideas(topic, channel_name):
    """
    Simulates AI brainstorming.
    Returns a list of creative video titles and concepts.
    """
    # Simulate network delay for realism
    time.sleep(1.5)
    
    templates = [
        "Why {topic} is Broken (And How to Fix It)",
        "I Tried {topic} for 7 Days - Here's What Happened",
        "The Ultimate Guide to {topic} for Beginners",
        "Stop Doing {topic} Like This! (Do This Instead)",
        "{topic} Explained in 5 Minutes",
        "The Dark Truth About {topic} nobody tells you",
        "10 {topic} Hacks That Actually Work",
        "How {channel_name} Mastered {topic}",
        "Is {topic} Worth It in 2024?",
        "My Secret {topic} Strategy Revealed"
    ]
    
    # Randomly select 5 templates and fill them
    selected = random.sample(templates, 5)
    ideas = []
    
    for i, tmpl in enumerate(selected):
        title = tmpl.format(topic=topic, channel_name=channel_name)
        ideas.append({
            'id': i + 1,
            'title': title,
            'confidence': random.randint(85, 99)
        })
        
    return ideas

def generate_script(title, tone):
    """
    Simulates AI Script Writing.
    Returns a structured script based on the title and tone.
    """
    time.sleep(2.0)
    
    return f"""
# Video Script: {title}
**Tone:** {tone.capitalize()}

## [0:00-0:30] The Hook
(Face Camera, High Energy)
"Have you ever wondered why {title.split(' ')[0]} seems so complicated? Well, today we're breaking it down once and for all."

## [0:30-1:30] The Problem
"Most people get stuck when they try to start. They think..."
(Cut to B-Roll of common mistakes)
"But here is the truth..."

## [1:30-5:00] The Solution ({tone} Style)
1. **Step One:** The Foundation.
2. **Step Two:** The Execution.
   (Show screen recording or demonstration)
3. **Step Three:** The Secret Sauce.

## [5:00-6:00] Conclusion & CTA
"Now that you know the secret, go try it out! Don't forget to like and subscribe for more content."
"""
