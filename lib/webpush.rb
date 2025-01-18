module Webpush
  # To store as the WEBPUSH_KEY environment variable
  def self.generate_key
    Base64.strict_encode64(OpenSSL::PKey::EC.generate('prime256v1').to_der)
  end

  def self.key
    webpush_key = Rails.application.credentials.webpush_key
    @ecdsa_key ||= OpenSSL::PKey::EC.new(Base64.strict_decode64(webpush_key))
  end

  def self.public_key
    @public_key ||= Base64.urlsafe_encode64(key.public_key.to_bn.to_s(2), padding: false)
  end

  def self.encrypt_payload(subscription:, payload:)
      group_name = 'prime256v1'
      salt = Random.new.bytes(16)

      server = OpenSSL::PKey::EC.generate(group_name)
      server_public_key_bn = server.public_key.to_bn

      group = OpenSSL::PKey::EC::Group.new(group_name)
      client_public_key_bn = OpenSSL::BN.new(Base64.urlsafe_decode64(subscription.p256dh), 2)
      client_public_key = OpenSSL::PKey::EC::Point.new(group, client_public_key_bn)

      shared_secret = server.dh_compute_key(client_public_key)

      client_auth_token = Base64.urlsafe_decode64(subscription.auth)

      info = "WebPush: info\0" + client_public_key_bn.to_s(2) + server_public_key_bn.to_s(2)
      content_encryption_key_info = "Content-Encoding: aes128gcm\0"
      nonce_info = "Content-Encoding: nonce\0"

      hash = 'sha256'
      prk = OpenSSL::KDF.hkdf(shared_secret, salt: client_auth_token, info: info, hash: hash, length: 32)
      content_encryption_key = OpenSSL::KDF.hkdf(prk, salt: salt, info: content_encryption_key_info, hash: hash, length: 16)

      nonce = OpenSSL::KDF.hkdf(prk, salt: salt, info: nonce_info, hash: hash, length: 12)

      cipher = OpenSSL::Cipher.new('aes-128-gcm')
      cipher.encrypt
      cipher.key = content_encryption_key
      cipher.iv = nonce
      text = cipher.update(payload)
      padding = cipher.update("\2\0")
      e_text = text + padding + cipher.final
      e_tag = cipher.auth_tag
      ciphertext = e_text + e_tag

      serverkey16bn = [server_public_key_bn.to_s(16)].pack('H*')
      rs = ciphertext.bytesize
      raise ArgumentError, "encrypted payload is too big" if rs > 4096

      aes128gcmheader = "#{salt}" + [rs].pack('N*') + [serverkey16bn.bytesize].pack('C*') + serverkey16bn

      aes128gcmheader + ciphertext
  end

  def self.post(subscription:, payload: nil)
    sub = 'mailto:contact0@yakitara.com'
    aud = subscription.endpoint[%r{^\w+://.+/}, 0]
    exp = 24.hour.from_now.to_i
    jwt = JWT.encode({sub:, aud:, exp:}, key, 'ES256', {'typ': 'JWT', 'alg': 'ES256'})

    case payload
    when nil
      payload = ''
    when String
    else
      payload = payload.to_json
    end
    body = encrypt_payload(subscription:, payload:)

    response = Faraday.post(
      subscription.endpoint,
      body,
      {
        'Authorization' => "vapid t=#{jwt},k=#{public_key.delete('=')}",
        'Crypto-Key' => "p256ecdsa=#{public_key}",
        'Content-Length' => body.length.to_s,
        'Content-Type' => 'application/octet-stream',
        'Content-Encoding' => 'aes128gcm',
        'TTL' => '60'
      }
    );
    p response
  end
end
