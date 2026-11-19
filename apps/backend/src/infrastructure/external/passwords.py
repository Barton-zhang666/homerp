from asyncio import to_thread
from functools import lru_cache

from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError


class ArgonPasswords:
    def __init__(self) -> None:
        self.hasher = PasswordHasher()
        self.dummy = self.hasher.hash("unassigned-account")

    async def hash(self, password: str) -> str:
        return await to_thread(self.hasher.hash, password)

    async def verify(self, password: str, encoded: str | None) -> bool:
        try:
            return await to_thread(self.hasher.verify, encoded or self.dummy, password)
        except VerifyMismatchError:
            return False


@lru_cache
def get_passwords() -> ArgonPasswords:
    return ArgonPasswords()
