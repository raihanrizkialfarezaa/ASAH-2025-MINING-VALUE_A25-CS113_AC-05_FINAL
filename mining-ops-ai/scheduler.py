import schedule
import time
from datetime import datetime
from train_pipeline import run_daily_training
import sys

def job():
    print(f"\n{'='*70}")
    print(f"🕒 SCHEDULED TRAINING TRIGGERED at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{'='*70}\n")
    try:
        run_daily_training()
    except Exception as e:
        print(f"❌ Scheduled training failed: {e}")
    print(f"\n{'='*70}")
    print(f"⏸️  Next training scheduled for 02:00 AM tomorrow")
    print(f"{'='*70}\n")

if __name__ == "__main__":
    print("="*70)
    print("🤖 AI MODEL AUTO-TRAINING SCHEDULER STARTED")
    print("="*70)
    print(f"📅 Schedule: Daily at 02:00 AM")
    print(f"🔄 Service started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("="*70)
    
    schedule.every().day.at("02:00").do(job)
    
    print("\n⚙️  Press Ctrl+C to stop the scheduler\n")
    
    try:
        while True:
            schedule.run_pending()
            time.sleep(60)
    except KeyboardInterrupt:
        print("\n\n🛑 Scheduler stopped by user")
        sys.exit(0)
