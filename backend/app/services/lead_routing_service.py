from __future__ import annotations
from datetime import datetime
from typing import Optional
from sqlalchemy import select, func
from app.models.user import User
from app.models.lead import Lead
from app.models import lead as lead_model  # for typing


class LeadRoutingService:
    def __init__(self, db, tenant_id: str):
        self.db = db
        self.tenant_id = tenant_id

    async def _active_users(self):
        # Lazy import to avoid circulars during startup
        from app.models.user import User
        q = select(User).where(User.tenant_id == self.tenant_id, User.is_active == True)
        result = await self.db.execute(q)
        return result.scalars().all()

    async def _lead_counts_by_owner(self):
        users = await self._active_users()
        counts = {u.id: 0 for u in users}
        if not users:
            return counts
        q = select(Lead.owner_id, func.count(Lead.id)).where(Lead.tenant_id == self.tenant_id).group_by(Lead.owner_id)
        result = await self.db.execute(q)
        rows = result.all()
        for owner_id, c in rows:
            counts[owner_id] = c
        return counts

    async def pick_owner_id(self, strategy: str = "round_robin", location: Optional[str] = None, industry: Optional[str] = None) -> Optional[str]:
        # Currently implement minimal strategies with graceful fallbacks
        if strategy == "round_robin":
            counts = await self._lead_counts_by_owner()
            if not counts:
                return None
            # pick owner with minimum leads; tie-breaker by id
            min_owner = min(counts.items(), key=lambda kv: (kv[1], kv[0]))
            return min_owner[0]
        # Geo-based / Industry-based are placeholders in this simplified implementation
        # Fallback to round_robin if not enough data
        return await self.pick_owner_id("round_robin")
