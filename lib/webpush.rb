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

  def self.post(endpoint:)
    sub = 'mailto:contact0@yakitara.com'
    aud = endpoint[%r{^\w+://.+/}, 0]
    exp = 24.hour.from_now.to_i
    jwt = JWT.encode({ sub:, aud:, exp: }, key, 'ES256')

    response = Faraday.post(
      endpoint,
      '',
      {
        'Authorization' => "WebPush #{jwt}",
        'Crypto-Key' => "p256ecdsa=#{public_key}",
        # 'Content-Length' => '0',
        'TTL' => '60'
      }
    );
    p response
  end
end
