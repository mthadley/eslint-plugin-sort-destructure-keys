workflow "CI" {
  resolves = ["Runs the tests"]
  on = "push"
}

action "Installs dependencies" {
  uses = "actions/npm@59b64a598378f31e49cb76f27d6f3312b582f680"
  args = "install"
}

action "Runs the tests" {
  uses = "actions/npm@59b64a598378f31e49cb76f27d6f3312b582f680"
  needs = ["Installs dependencies"]
  args = "test"
}
