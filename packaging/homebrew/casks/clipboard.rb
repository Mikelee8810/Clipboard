cask "clipboard" do
  arch arm: "aarch64", intel: "x64"

  version "__VERSION__"
  sha256 arm:   "__SHA256_ARM__",
         intel: "__SHA256_INTEL__"

  url "https://github.com/UniClipboard/UniClipboard/releases/download/v#{version}/Clipboard_#{version}_#{arch}.dmg",
      verified: "github.com/UniClipboard/UniClipboard/"
  name "Clipboard"
  desc "Cross-device clipboard syncing tool"
  homepage "https://www.uniclipboard.app/"

  livecheck do
    url :url
    strategy :github_latest
  end

  depends_on macos: :monterey

  app "Clipboard.app"

  zap trash: [
    "~/Library/Application Support/app.clipboard.desktop",
    "~/Library/Caches/app.clipboard.desktop",
    "~/Library/Logs/app.clipboard.desktop",
  ]
end
