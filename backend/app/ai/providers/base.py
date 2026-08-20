from abc import ABC, abstractmethod


class LLMProvider(ABC):
    name: str

    @abstractmethod
    async def is_available(self) -> bool: ...

    @abstractmethod
    async def complete(self, *, system_prompt: str, user_prompt: str) -> str: ...
