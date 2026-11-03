import secrets


class CryptoService():

    def __init__(self):
        self.port_num = 9000
        self.srtids = set([])

    def generate_srt_credentials(self,bits=128):
        """
        Generates a cryptographically secure Stream ID and Passphrase.
        128 bits = 16 bytes. 256 bits = 32 bytes.
        """
        num_bytes = bits // 8
        stream_id = secrets.token_urlsafe(num_bytes)
        while(stream_id in self.srtids):
            stream_id = secrets.token_urlsafe(num_bytes)
        self.srtids.add(stream_id)
        passphrase = secrets.token_urlsafe(num_bytes)
        self.port_num += 1
        
        return stream_id, passphrase, self.port_num