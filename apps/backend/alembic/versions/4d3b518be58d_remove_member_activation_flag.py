"""Remove member activation flag."""

import sqlalchemy as sa

from alembic import op

revision = "4d3b518be58d"
down_revision = "ae40831365e1"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_column("members", "active")


def downgrade() -> None:
    op.add_column(
        "members", sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.true())
    )
    op.alter_column(
        "members",
        "active",
        existing_type=sa.Boolean(),
        existing_nullable=False,
        server_default=None,
    )
