# BNS ↔ IPC cross reference (common provisions).
# This is a starter map, not an exhaustive concordance. Verify against the
# official BNS 2023 / IPC 1860 texts before filing anything.

BNS_TO_IPC = {
    "103": "302",   # punishment for murder
    "105": "304",   # culpable homicide not amounting to murder
    "303": "378",   # theft
    "309": "392",   # robbery
    "316": "405",   # criminal breach of trust
    "318": "415",   # cheating
    "351": "503",   # criminal intimidation
    "352": "504",   # intentional insult
}


def get_ipc_equivalent(bns_section):
    return BNS_TO_IPC.get(str(bns_section))